import { describe, it, expect } from 'vitest';
import { searchAssets, fetchPrices } from '../../server/prices.js';

const ok = (body) => async () => ({ ok: true, status: 200, json: async () => body });
const failing = (status) => async () => ({ ok: false, status, json: async () => ({}) });

describe('searchAssets', () => {
  it('maps CoinGecko results to id, symbol and name', async () => {
    const fetchImpl = ok({
      coins: [{ id: 'bitcoin', symbol: 'btc', name: 'Bitcoin', market_cap_rank: 1 }],
    });
    expect(await searchAssets('bit', fetchImpl)).toEqual([
      { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
    ]);
  });

  it('upper-cases the symbol', async () => {
    const fetchImpl = ok({ coins: [{ id: 'solana', symbol: 'sol', name: 'Solana' }] });
    const [asset] = await searchAssets('sol', fetchImpl);
    expect(asset.symbol).toBe('SOL');
  });

  it('returns an empty list for a blank query without calling the network', async () => {
    let called = false;
    const fetchImpl = async () => { called = true; return ok({ coins: [] })(); };
    expect(await searchAssets('   ', fetchImpl)).toEqual([]);
    expect(called).toBe(false);
  });

  it('caps the number of results', async () => {
    const coins = Array.from({ length: 50 }, (_, i) => ({ id: `c${i}`, symbol: `c${i}`, name: `Coin ${i}` }));
    const result = await searchAssets('c', ok({ coins }));
    expect(result.length).toBeLessThanOrEqual(15);
  });

  it('tolerates a response with no coins field', async () => {
    expect(await searchAssets('x', ok({}))).toEqual([]);
  });

  it('throws a Portuguese message when the request fails', async () => {
    await expect(searchAssets('btc', failing(500))).rejects.toThrow(/CoinGecko/);
  });

  it('reports the rate limit distinctly', async () => {
    await expect(searchAssets('btc', failing(429))).rejects.toThrow(/limite/i);
  });

  it('sends the query to the search endpoint', async () => {
    let seen = '';
    const fetchImpl = async (url) => { seen = url; return { ok: true, status: 200, json: async () => ({ coins: [] }) }; };
    await searchAssets('eth', fetchImpl);
    expect(seen).toContain('/search?query=eth');
  });
});

describe('fetchPrices', () => {
  it('returns a map of id to per-currency prices', async () => {
    const fetchImpl = ok({ bitcoin: { usd: 63900, brl: 330969 }, solana: { usd: 76.4, brl: 395.71 } });
    expect(await fetchPrices(['bitcoin', 'solana'], ['usd', 'brl'], fetchImpl)).toEqual({
      bitcoin: { usd: 63900, brl: 330969 },
      solana: { usd: 76.4, brl: 395.71 },
    });
  });

  it('keeps the currencies it did get when one is missing', async () => {
    const fetchImpl = ok({ bitcoin: { usd: 63900 } });
    expect(await fetchPrices(['bitcoin'], ['usd', 'brl'], fetchImpl)).toEqual({ bitcoin: { usd: 63900 } });
  });

  it('omits assets missing from the response instead of inventing a price', async () => {
    const fetchImpl = ok({ bitcoin: { usd: 63900, brl: 330969 } });
    const prices = await fetchPrices(['bitcoin', 'ghost'], ['usd', 'brl'], fetchImpl);
    expect(prices.ghost).toBeUndefined();
  });

  it('returns an empty map for no ids without calling the network', async () => {
    let called = false;
    const fetchImpl = async () => { called = true; return ok({})(); };
    expect(await fetchPrices([], ['usd'], fetchImpl)).toEqual({});
    expect(called).toBe(false);
  });

  it('asks for every id and every currency in a single request', async () => {
    let seen = '';
    const fetchImpl = async (url) => { seen = url; return { ok: true, status: 200, json: async () => ({}) }; };
    await fetchPrices(['bitcoin', 'solana'], ['usd', 'brl'], fetchImpl);
    expect(seen).toContain('ids=bitcoin%2Csolana');
    expect(seen).toContain('vs_currencies=usd%2Cbrl');
  });

  it('defaults to quoting every supported currency', async () => {
    let seen = '';
    const fetchImpl = async (url) => { seen = url; return { ok: true, status: 200, json: async () => ({}) }; };
    await fetchPrices(['bitcoin'], undefined, fetchImpl);
    expect(seen).toContain('vs_currencies=usd%2Cbrl');
  });

  it('throws a Portuguese message when the request fails', async () => {
    await expect(fetchPrices(['bitcoin'], ['usd'], failing(503))).rejects.toThrow(/CoinGecko/);
  });

  it('reports the rate limit distinctly', async () => {
    await expect(fetchPrices(['bitcoin'], ['usd'], failing(429))).rejects.toThrow(/limite/i);
  });
});
