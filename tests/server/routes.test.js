import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createApp } from '../../server/routes.js';

let dir;
let dataFile;

const asset = (over) => ({
  id: 'alpha', symbol: 'AAA', name: 'Alpha', source: 'coingecko',
  target: 1, quantity: 2, colorSlot: 1, lastPrice: 100, lastPriceAt: null,
  ...over,
});

const seed = (assets, history = []) =>
  writeFileSync(dataFile, JSON.stringify({ version: 1, currency: 'usd', assets, history }));

const app = (over = {}) =>
  createApp({ dataFile, apiKey: 'test-key', fetchImpl: async () => { throw new Error('unexpected network call'); }, ...over });

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'cpm-routes-'));
  dataFile = join(dir, 'portfolio.json');
});

afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe('GET /api/state', () => {
  it('returns an empty portfolio on a fresh install', async () => {
    const res = await request(app()).get('/api/state');
    expect(res.status).toBe(200);
    expect(res.body.portfolio.assets).toEqual([]);
    expect(res.body.warning).toBeNull();
  });

  it('returns the stored assets', async () => {
    seed([asset()]);
    const res = await request(app()).get('/api/state');
    expect(res.body.portfolio.assets).toHaveLength(1);
    expect(res.body.portfolio.assets[0].symbol).toBe('AAA');
  });

  it('surfaces the corruption warning', async () => {
    writeFileSync(dataFile, 'not json at all');
    const res = await request(app()).get('/api/state');
    expect(res.status).toBe(200);
    expect(res.body.warning).toMatch(/não pôde ser lido/);
  });

  it('reports whether the assistant is configured', async () => {
    const withKey = await request(app()).get('/api/state');
    expect(withKey.body.assistantReady).toBe(true);
    const without = await request(app({ apiKey: '' })).get('/api/state');
    expect(without.body.assistantReady).toBe(false);
  });
});

describe('PUT /api/assets', () => {
  it('stores a valid asset list', async () => {
    const res = await request(app()).put('/api/assets').send({ assets: [asset()] });
    expect(res.status).toBe(200);
    expect(JSON.parse(readFileSync(dataFile, 'utf8')).assets).toHaveLength(1);
  });

  it('rejects targets that do not sum to 100%', async () => {
    const res = await request(app()).put('/api/assets').send({ assets: [asset({ target: 0.5 })] });
    expect(res.status).toBe(400);
    expect(res.body.errors[0]).toMatch(/Falta/);
  });

  it('does not write anything when validation fails', async () => {
    seed([asset()]);
    await request(app()).put('/api/assets').send({ assets: [asset({ target: 0.5 })] });
    expect(JSON.parse(readFileSync(dataFile, 'utf8')).assets[0].target).toBe(1);
  });

  it('rejects a body without an assets array', async () => {
    const res = await request(app()).put('/api/assets').send({ nope: true });
    expect(res.status).toBe(400);
  });

  it('accepts an empty list so the user can remove their last asset', async () => {
    seed([asset()]);
    const res = await request(app()).put('/api/assets').send({ assets: [] });
    expect(res.status).toBe(200);
    expect(JSON.parse(readFileSync(dataFile, 'utf8')).assets).toEqual([]);
  });

  it('assigns the next free colour slot to an asset that has none', async () => {
    const res = await request(app())
      .put('/api/assets')
      .send({ assets: [asset({ id: 'a', target: 0.5, colorSlot: 2 }), asset({ id: 'b', target: 0.5, colorSlot: undefined })] });
    expect(res.status).toBe(200);
    const saved = JSON.parse(readFileSync(dataFile, 'utf8')).assets;
    expect(saved.find((a) => a.id === 'b').colorSlot).toBe(1);
  });

  it('never reassigns an existing colour slot', async () => {
    const res = await request(app())
      .put('/api/assets')
      .send({ assets: [asset({ id: 'a', target: 0.5, colorSlot: 4 }), asset({ id: 'b', target: 0.5, colorSlot: 3 })] });
    const saved = JSON.parse(readFileSync(dataFile, 'utf8')).assets;
    expect(saved.find((a) => a.id === 'a').colorSlot).toBe(4);
    expect(saved.find((a) => a.id === 'b').colorSlot).toBe(3);
    expect(res.status).toBe(200);
  });
});

describe('POST /api/refresh', () => {
  it('updates prices and records a history snapshot', async () => {
    seed([asset({ id: 'alpha', quantity: 2 })]);
    const fetchImpl = async () => ({ ok: true, status: 200, json: async () => ({ alpha: { usd: 150 } }) });
    const res = await request(app({ fetchImpl })).post('/api/refresh');

    expect(res.status).toBe(200);
    const saved = JSON.parse(readFileSync(dataFile, 'utf8'));
    expect(saved.assets[0].lastPrice).toBe(150);
    expect(saved.assets[0].lastPriceAt).toBeTruthy();
    expect(saved.history).toHaveLength(1);
    expect(saved.history[0].total).toBe(300);
  });

  it('leaves manual assets untouched', async () => {
    seed([asset({ id: 'manual-one', source: 'manual', lastPrice: 42 })]);
    const fetchImpl = async () => ({ ok: true, status: 200, json: async () => ({}) });
    await request(app({ fetchImpl })).post('/api/refresh');
    expect(JSON.parse(readFileSync(dataFile, 'utf8')).assets[0].lastPrice).toBe(42);
  });

  it('keeps the previous price and reports the failure when CoinGecko is down', async () => {
    seed([asset({ lastPrice: 99 })]);
    const fetchImpl = async () => ({ ok: false, status: 503, json: async () => ({}) });
    const res = await request(app({ fetchImpl })).post('/api/refresh');

    expect(res.status).toBe(502);
    expect(res.body.error).toMatch(/CoinGecko/);
    const saved = JSON.parse(readFileSync(dataFile, 'utf8'));
    expect(saved.assets[0].lastPrice).toBe(99);
    expect(saved.history).toHaveLength(0);
  });

  it('marks only the assets missing from the response as stale', async () => {
    seed([asset({ id: 'alpha', target: 0.5, lastPrice: 10 }), asset({ id: 'beta', symbol: 'BBB', target: 0.5, lastPrice: 20 })]);
    const fetchImpl = async () => ({ ok: true, status: 200, json: async () => ({ alpha: { usd: 11 } }) });
    const res = await request(app({ fetchImpl })).post('/api/refresh');

    expect(res.status).toBe(200);
    expect(res.body.missing).toEqual(['BBB']);
    const saved = JSON.parse(readFileSync(dataFile, 'utf8')).assets;
    expect(saved.find((a) => a.id === 'alpha').lastPrice).toBe(11);
    expect(saved.find((a) => a.id === 'beta').lastPrice).toBe(20);
  });

  it('succeeds with no assets without calling the network', async () => {
    const res = await request(app()).post('/api/refresh');
    expect(res.status).toBe(200);
  });
});

/** Search hits /search first, then /simple/price for the ids it found. */
const searchThenPrice = (coins, prices) => async (url) => {
  if (url.includes('/search')) {
    return { ok: true, status: 200, json: async () => ({ coins }) };
  }
  return { ok: true, status: 200, json: async () => prices };
};

describe('GET /api/search', () => {
  it('passes results through with the current price attached', async () => {
    const fetchImpl = searchThenPrice(
      [{ id: 'bitcoin', symbol: 'btc', name: 'Bitcoin' }],
      { bitcoin: { usd: 63940 } }
    );
    const res = await request(app({ fetchImpl })).get('/api/search?q=bit');
    expect(res.body.results).toEqual([
      { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', price: 63940 },
    ]);
  });

  it('returns a null price for a result CoinGecko does not quote', async () => {
    const fetchImpl = searchThenPrice(
      [{ id: 'ghost', symbol: 'ghs', name: 'Ghost' }],
      {}
    );
    const res = await request(app({ fetchImpl })).get('/api/search?q=ghost');
    expect(res.body.results[0].price).toBeNull();
  });

  it('still returns the results when the price lookup fails', async () => {
    const fetchImpl = async (url) => {
      if (url.includes('/search')) {
        return { ok: true, status: 200, json: async () => ({ coins: [{ id: 'bitcoin', symbol: 'btc', name: 'Bitcoin' }] }) };
      }
      return { ok: false, status: 429, json: async () => ({}) };
    };
    const res = await request(app({ fetchImpl })).get('/api/search?q=bit');
    expect(res.status).toBe(200);
    expect(res.body.results[0].symbol).toBe('BTC');
    expect(res.body.results[0].price).toBeNull();
  });

  it('returns an empty list for a missing query', async () => {
    const res = await request(app()).get('/api/search');
    expect(res.status).toBe(200);
    expect(res.body.results).toEqual([]);
  });

  it('reports a CoinGecko failure as a gateway error', async () => {
    const fetchImpl = async () => ({ ok: false, status: 429, json: async () => ({}) });
    const res = await request(app({ fetchImpl })).get('/api/search?q=bit');
    expect(res.status).toBe(502);
    expect(res.body.error).toMatch(/limite/i);
  });
});

describe('POST /api/chat', () => {
  it('answers using the model', async () => {
    seed([asset()]);
    const fetchImpl = async () => ({
      ok: true, status: 200,
      json: async () => ({ candidates: [{ content: { parts: [{ text: 'resposta do modelo' }] } }] }),
    });
    const res = await request(app({ fetchImpl })).post('/api/chat').send({ question: 'e aí?' });
    expect(res.status).toBe(200);
    expect(res.body.answer).toBe('resposta do modelo');
  });

  it('sends the portfolio state in the prompt', async () => {
    seed([asset({ symbol: 'ZZZ' })]);
    let body = null;
    const fetchImpl = async (_url, init) => {
      body = JSON.parse(init.body);
      return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }) };
    };
    await request(app({ fetchImpl })).post('/api/chat').send({ question: 'oi' });
    expect(body.contents[0].parts[0].text).toContain('ZZZ');
  });

  it('rejects an empty question', async () => {
    const res = await request(app()).post('/api/chat').send({ question: '   ' });
    expect(res.status).toBe(400);
  });

  it('reports a missing key without touching the network', async () => {
    const res = await request(app({ apiKey: '' })).post('/api/chat').send({ question: 'oi' });
    expect(res.status).toBe(502);
    expect(res.body.error).toMatch(/chave/i);
  });

  it('does not let a chat failure affect the dashboard', async () => {
    seed([asset()]);
    const fetchImpl = async () => ({ ok: false, status: 500, json: async () => ({}) });
    await request(app({ fetchImpl })).post('/api/chat').send({ question: 'oi' });
    const res = await request(app()).get('/api/state');
    expect(res.status).toBe(200);
    expect(res.body.portfolio.assets).toHaveLength(1);
  });
});
