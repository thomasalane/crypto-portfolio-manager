import { existsSync } from 'node:fs';
import express from 'express';
import { loadPortfolio, savePortfolio, backupPathFor } from './store.js';
import { searchAssets, fetchPrices } from './prices.js';
import { buildPrompt, askModel } from './chat.js';
import { validateAssets } from '../core/validation.js';
import { computeState } from '../core/allocation.js';
import { planRebalance } from '../core/rebalance.js';
import { CURRENCIES, isSupported, withPricesIn } from '../core/currency.js';

/** The donut carries four hues; anything past that shares the neutral slice. */
const MAX_COLOR_SLOTS = 4;

/**
 * Give any asset without a slot the lowest free one. Existing slots are never
 * touched — a colour identifies an asset, not its position in a ranking.
 */
function assignColorSlots(assets) {
  const taken = new Set(assets.map((a) => a.colorSlot).filter((s) => Number.isInteger(s) && s > 0));
  return assets.map((a) => {
    if (Number.isInteger(a.colorSlot) && a.colorSlot > 0) return a;
    let slot = null;
    for (let i = 1; i <= MAX_COLOR_SLOTS; i += 1) {
      if (!taken.has(i)) { slot = i; taken.add(i); break; }
    }
    return { ...a, colorSlot: slot };
  });
}

/**
 * @param {{ dataFile: string, apiKey: string, fetchImpl?: typeof fetch }} config
 * @returns {import('express').Express}
 */
export function createApp({ dataFile, apiKey, fetchImpl = fetch }) {
  const app = express();
  app.use(express.json());

  app.get('/api/state', (req, res) => {
    const { portfolio, warning } = loadPortfolio(dataFile);
    res.json({
      portfolio,
      warning,
      assistantReady: Boolean(apiKey),
      backupAvailable: existsSync(backupPathFor(dataFile)),
      currencies: CURRENCIES,
    });
  });

  app.post('/api/restore', (req, res) => {
    const backup = backupPathFor(dataFile);
    if (!existsSync(backup)) {
      return res.status(400).json({ error: 'There is no earlier version to go back to.' });
    }

    // savePortfolio parks the current version as it writes, so restoring is
    // itself undoable — clicking twice returns to where you started.
    const { portfolio } = loadPortfolio(backup);
    savePortfolio(dataFile, portfolio);
    res.json({ portfolio });
  });

  app.put('/api/currency', (req, res) => {
    const currency = req.body?.currency;
    if (!isSupported(currency)) {
      return res.status(400).json({ error: 'That currency is not supported.' });
    }

    // Every asset already carries a price in both currencies, so switching is
    // a display change — no refetch, no conversion, no exchange-rate guessing.
    const { portfolio } = loadPortfolio(dataFile);
    const updated = { ...portfolio, currency };
    savePortfolio(dataFile, updated);
    res.json({ portfolio: updated });
  });

  app.put('/api/assets', (req, res) => {
    const incoming = req.body?.assets;
    if (!Array.isArray(incoming)) {
      return res.status(400).json({ errors: ['The request body must contain a list of assets.'] });
    }

    const assets = assignColorSlots(incoming);
    const { ok, errors } = validateAssets(assets);
    if (!ok) return res.status(400).json({ errors });

    const { portfolio } = loadPortfolio(dataFile);
    savePortfolio(dataFile, { ...portfolio, assets });
    res.json({ portfolio: { ...portfolio, assets } });
  });

  app.post('/api/refresh', async (req, res) => {
    const { portfolio } = loadPortfolio(dataFile);
    const tracked = portfolio.assets.filter((a) => a.source !== 'manual');

    let prices;
    try {
      prices = await fetchPrices(tracked.map((a) => a.id), CURRENCIES, fetchImpl);
    } catch (err) {
      // Prices on disk stay as they were — a dead API must not erase them.
      return res.status(502).json({ error: err.message });
    }

    const at = new Date().toISOString();
    const missing = [];
    const assets = portfolio.assets.map((a) => {
      if (a.source === 'manual') return a;
      const quoted = prices[a.id];
      if (!quoted) {
        missing.push(a.symbol);
        return a;
      }
      return { ...a, prices: { ...a.prices, ...quoted }, lastPriceAt: at };
    });

    // Record the total in every currency so the history stays readable after a
    // switch, instead of needing historical exchange rates to fill the gap.
    const totals = Object.fromEntries(
      CURRENCIES.map((c) => [c, computeState(withPricesIn(assets, c)).total])
    );
    const history = [...portfolio.history, { at, totals }];
    const updated = { ...portfolio, assets, history };
    savePortfolio(dataFile, updated);

    res.json({ portfolio: updated, missing });
  });

  app.get('/api/search', async (req, res) => {
    let found;
    try {
      found = await searchAssets(req.query.q ?? '', fetchImpl);
    } catch (err) {
      return res.status(502).json({ error: err.message });
    }

    // Quote every hit so the user picks knowing the price, and the asset lands
    // already priced instead of waiting for the next refresh. A failure here is
    // not worth losing the search over — the results still go out, unpriced.
    let prices = {};
    if (found.length > 0) {
      try {
        prices = await fetchPrices(found.map((f) => f.id), CURRENCIES, fetchImpl);
      } catch {
        prices = {};
      }
    }

    res.json({
      results: found.map((f) => ({ ...f, prices: prices[f.id] ?? null })),
    });
  });

  app.post('/api/chat', async (req, res) => {
    const question = String(req.body?.question ?? '').trim();
    if (!question) return res.status(400).json({ error: 'Write a question first.' });

    const { portfolio } = loadPortfolio(dataFile);
    const priced = withPricesIn(portfolio.assets, portfolio.currency);
    const { total, rows } = computeState(priced);
    const { orders } = planRebalance(priced);

    const prompt = buildPrompt(
      { currency: portfolio.currency, total, rows, rebalanceOrders: orders },
      question
    );

    try {
      const answer = await askModel(prompt, apiKey, fetchImpl);
      res.json({ answer });
    } catch (err) {
      // Isolated on purpose: the dashboard keeps working without the assistant.
      res.status(502).json({ error: err.message });
    }
  });

  return app;
}
