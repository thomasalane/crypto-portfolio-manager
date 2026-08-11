import express from 'express';
import { loadPortfolio, savePortfolio } from './store.js';
import { searchAssets, fetchPrices } from './prices.js';
import { buildPrompt, askModel } from './chat.js';
import { validateAssets } from '../core/validation.js';
import { computeState } from '../core/allocation.js';
import { planRebalance } from '../core/rebalance.js';

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
    res.json({ portfolio, warning, assistantReady: Boolean(apiKey) });
  });

  app.put('/api/assets', (req, res) => {
    const incoming = req.body?.assets;
    if (!Array.isArray(incoming)) {
      return res.status(400).json({ errors: ['O corpo da requisição precisa conter uma lista de ativos.'] });
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
      prices = await fetchPrices(tracked.map((a) => a.id), portfolio.currency, fetchImpl);
    } catch (err) {
      // Prices on disk stay as they were — a dead API must not erase them.
      return res.status(502).json({ error: err.message });
    }

    const at = new Date().toISOString();
    const missing = [];
    const assets = portfolio.assets.map((a) => {
      if (a.source === 'manual') return a;
      const price = prices[a.id];
      if (typeof price !== 'number') {
        missing.push(a.symbol);
        return a;
      }
      return { ...a, lastPrice: price, lastPriceAt: at };
    });

    const { total } = computeState(assets);
    const history = [...portfolio.history, { at, total }];
    const updated = { ...portfolio, assets, history };
    savePortfolio(dataFile, updated);

    res.json({ portfolio: updated, missing });
  });

  app.get('/api/search', async (req, res) => {
    try {
      const results = await searchAssets(req.query.q ?? '', fetchImpl);
      res.json({ results });
    } catch (err) {
      res.status(502).json({ error: err.message });
    }
  });

  app.post('/api/chat', async (req, res) => {
    const question = String(req.body?.question ?? '').trim();
    if (!question) return res.status(400).json({ error: 'Escreva uma pergunta.' });

    const { portfolio } = loadPortfolio(dataFile);
    const { total, rows } = computeState(portfolio.assets);
    const { orders } = planRebalance(portfolio.assets);

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
