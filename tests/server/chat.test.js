import { describe, it, expect } from 'vitest';
import { buildPrompt, askModel, MODEL } from '../../server/chat.js';

const state = {
  currency: 'usd',
  total: 1000,
  rows: [
    { symbol: 'AAA', name: 'Alpha', quantity: 9, price: 100, value: 900, target: 0.5, actual: 0.9, deviation: 0.4, onTarget: false, lastPriceAt: '2026-08-11T16:42:00.000Z' },
    { symbol: 'BBB', name: 'Beta', quantity: 1, price: 100, value: 100, target: 0.5, actual: 0.1, deviation: -0.4, onTarget: false, lastPriceAt: '2026-08-11T16:42:00.000Z' },
  ],
  rebalanceOrders: [
    { symbol: 'AAA', side: 'sell', amount: 400 },
    { symbol: 'BBB', side: 'buy', amount: 400 },
  ],
};

describe('buildPrompt', () => {
  it('includes every asset symbol', () => {
    const prompt = buildPrompt(state, 'e aí?');
    expect(prompt).toContain('AAA');
    expect(prompt).toContain('BBB');
  });

  it('includes the target and current share of each asset', () => {
    const prompt = buildPrompt(state, 'e aí?');
    expect(prompt).toContain('90.0%');
    expect(prompt).toContain('50.0%');
  });

  it('includes the portfolio total', () => {
    expect(buildPrompt(state, 'x')).toContain('1,000.00');
  });

  it('includes the rebalance orders already calculated', () => {
    const prompt = buildPrompt(state, 'x');
    expect(prompt).toMatch(/sell.*AAA/i);
    expect(prompt).toMatch(/buy.*BBB/i);
  });

  it('includes the user question', () => {
    expect(buildPrompt(state, 'how far is AAA from target?')).toContain('how far is AAA from target?');
  });

  it('tells the model not to invent figures', () => {
    expect(buildPrompt(state, 'x')).toMatch(/do not calculate|do not invent/i);
  });

  it('tells the model to stay on the portfolio', () => {
    expect(buildPrompt(state, 'x')).toMatch(/portfolio/i);
  });

  it('handles an empty portfolio without crashing', () => {
    const prompt = buildPrompt({ currency: 'usd', total: 0, rows: [], rebalanceOrders: [] }, 'hi');
    expect(prompt).toMatch(/no assets/i);
  });
});

describe('askModel', () => {
  const okResponse = (text) => async () => ({
    ok: true,
    status: 200,
    json: async () => ({ candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }] }),
  });

  it('returns the model text', async () => {
    expect(await askModel('oi', 'k', okResponse('resposta'))).toBe('resposta');
  });

  it('posts to the configured model endpoint', async () => {
    let seen = '';
    const fetchImpl = async (url) => { seen = url; return okResponse('r')(); };
    await askModel('oi', 'k', fetchImpl);
    expect(seen).toContain(`/models/${MODEL}:generateContent`);
  });

  it('sends the key as a header rather than in the URL', async () => {
    let seenUrl = '';
    let seenInit = null;
    const fetchImpl = async (url, init) => { seenUrl = url; seenInit = init; return okResponse('r')(); };
    await askModel('oi', 'secret-key', fetchImpl);
    expect(seenUrl).not.toContain('secret-key');
    expect(seenInit.headers['x-goog-api-key']).toBe('secret-key');
  });

  it('sends the prompt as the request text', async () => {
    let body = null;
    const fetchImpl = async (_url, init) => { body = JSON.parse(init.body); return okResponse('r')(); };
    await askModel('minha pergunta', 'k', fetchImpl);
    expect(body.contents[0].parts[0].text).toBe('minha pergunta');
  });

  it('disables thinking so the token budget goes to the answer', async () => {
    let body = null;
    const fetchImpl = async (_url, init) => { body = JSON.parse(init.body); return okResponse('r')(); };
    await askModel('oi', 'k', fetchImpl);
    expect(body.generationConfig.thinkingConfig.thinkingBudget).toBe(0);
  });

  it('refuses without a key and never touches the network', async () => {
    let called = false;
    const fetchImpl = async () => { called = true; return okResponse('r')(); };
    await expect(askModel('oi', '', fetchImpl)).rejects.toThrow(/api key/i);
    expect(called).toBe(false);
  });

  it('reports the rate limit distinctly', async () => {
    const fetchImpl = async () => ({ ok: false, status: 429, json: async () => ({}) });
    await expect(askModel('oi', 'k', fetchImpl)).rejects.toThrow(/free-tier limit/i);
  });

  it('reports an invalid key distinctly', async () => {
    const fetchImpl = async () => ({ ok: false, status: 400, json: async () => ({ error: { message: 'API key not valid' } }) });
    await expect(askModel('oi', 'k', fetchImpl)).rejects.toThrow(/api key/i);
  });

  it('throws when the response carries no text', async () => {
    const fetchImpl = async () => ({
      ok: true, status: 200,
      json: async () => ({ candidates: [{ content: { parts: [] }, finishReason: 'SAFETY' }] }),
    });
    await expect(askModel('oi', 'k', fetchImpl)).rejects.toThrow(/empty answer/i);
  });
});
