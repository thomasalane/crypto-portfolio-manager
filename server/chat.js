const BASE = 'https://generativelanguage.googleapis.com/v1beta';

/** The only text model the free tier exposes on this key. */
export const MODEL = 'gemini-2.5-flash';

const pct = (fraction) =>
  (fraction * 100).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const money = (value) =>
  value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Assemble everything the assistant is allowed to know. Every figure here is
 * already computed by core/ — the model explains, it never calculates.
 *
 * @param {{ currency: string, total: number, rows: Array, rebalanceOrders: Array }} state
 * @param {string} question
 * @returns {string}
 */
export function buildPrompt(state, question) {
  const { total, rows, rebalanceOrders = [] } = state;

  const table = rows.length
    ? rows
        .map((r) =>
          [
            `- ${r.symbol} (${r.name})`,
            `quantity ${r.quantity}`,
            `price ${money(r.price)}`,
            `value ${money(r.value)}`,
            `today ${pct(r.actual)}%`,
            `target ${pct(r.target)}%`,
            `deviation ${r.deviation >= 0 ? '+' : '−'}${pct(Math.abs(r.deviation))} points`,
            r.onTarget ? 'on target' : 'off target',
          ].join(' · ')
        )
        .join('\n')
    : 'No assets have been added yet.';

  const orders = rebalanceOrders.length
    ? rebalanceOrders
        .map((o) => `- ${o.side === 'sell' ? 'Sell' : 'Buy'} ${o.symbol}: ${money(o.amount)}`)
        .join('\n')
    : 'No orders needed.';

  return `You are the assistant of a crypto portfolio manager. Answer in English, briefly and directly.

Rules:
- Only answer about the portfolio below. If asked anything else, say you only handle this portfolio.
- Do not calculate or invent figures. Every value is already computed below; use exactly those.
- Do not give investment advice or opinions on what will rise or fall. Describe the situation and what rebalancing would do.

Portfolio state (values in ${String(state.currency ?? 'usd').toUpperCase()}):
Total value: ${money(total)}

Assets:
${table}

Calculated rebalance:
${orders}

User question: ${question}`;
}

/**
 * @param {string} prompt
 * @param {string} apiKey
 * @param {typeof fetch} fetchImpl
 * @returns {Promise<string>}
 */
export async function askModel(prompt, apiKey, fetchImpl = fetch) {
  if (!apiKey) {
    throw new Error('The API key is not configured. Add GEMINI_API_KEY to the .env file.');
  }

  const res = await fetchImpl(`${BASE}/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Header rather than query string so the key stays out of URLs and logs.
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 800,
        temperature: 0.2,
        // 2.5 Flash spends output budget on thinking by default, which can
        // return an empty answer. This portfolio Q&A does not need it.
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });

  if (!res.ok) {
    if (res.status === 429) {
      throw new Error('You have hit the model free-tier limit for now. Try again later.');
    }
    const body = await res.json().catch(() => ({}));
    const detail = body?.error?.message ?? '';
    if (res.status === 400 && /api key/i.test(detail)) {
      throw new Error('The API key was rejected. Check the GEMINI_API_KEY value in the .env file.');
    }
    throw new Error(`The model did not respond (error ${res.status}).`);
  }

  const body = await res.json();
  const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('The model returned an empty answer. Try rewording the question.');
  }
  return text;
}
