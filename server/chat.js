const BASE = 'https://generativelanguage.googleapis.com/v1beta';

/** The only text model the free tier exposes on this key. */
export const MODEL = 'gemini-2.5-flash';

const pct = (fraction) =>
  (fraction * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const money = (value) =>
  value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
            `quantidade ${r.quantity}`,
            `preço ${money(r.price)}`,
            `valor ${money(r.value)}`,
            `hoje ${pct(r.actual)}%`,
            `meta ${pct(r.target)}%`,
            `desvio ${r.deviation >= 0 ? '+' : '−'}${pct(Math.abs(r.deviation))} pontos`,
            r.onTarget ? 'na meta' : 'fora da meta',
          ].join(' · ')
        )
        .join('\n')
    : 'Nenhum ativo cadastrado ainda.';

  const orders = rebalanceOrders.length
    ? rebalanceOrders
        .map((o) => `- ${o.side === 'sell' ? 'Vender' : 'Comprar'} ${o.symbol}: ${money(o.amount)}`)
        .join('\n')
    : 'Nenhuma ordem necessária.';

  return `Você é o assistente de um gerenciador de portfolio de criptomoedas. Responda em português do Brasil, de forma direta e curta.

Regras:
- Responda apenas sobre o portfolio abaixo. Se perguntarem outra coisa, diga que você só trata deste portfolio.
- Não calcule nem invente números. Todos os valores já vêm calculados abaixo; use exatamente esses.
- Não dê conselho de investimento nem opinião sobre o que vai subir ou cair. Descreva a situação e o que o rebalanceamento faria.

Estado do portfolio (valores em ${String(state.currency ?? 'usd').toUpperCase()}):
Valor total: ${money(total)}

Ativos:
${table}

Rebalanceamento calculado:
${orders}

Pergunta do usuário: ${question}`;
}

/**
 * @param {string} prompt
 * @param {string} apiKey
 * @param {typeof fetch} fetchImpl
 * @returns {Promise<string>}
 */
export async function askModel(prompt, apiKey, fetchImpl = fetch) {
  if (!apiKey) {
    throw new Error('A chave da API não está configurada. Coloque GEMINI_API_KEY no arquivo .env.');
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
      throw new Error('Você atingiu o limite gratuito do modelo por enquanto. Tente de novo mais tarde.');
    }
    const body = await res.json().catch(() => ({}));
    const detail = body?.error?.message ?? '';
    if (res.status === 400 && /api key/i.test(detail)) {
      throw new Error('A chave da API foi recusada. Confira o valor de GEMINI_API_KEY no arquivo .env.');
    }
    throw new Error(`O modelo não respondeu (erro ${res.status}).`);
  }

  const body = await res.json();
  const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('O modelo devolveu uma resposta vazia. Tente reformular a pergunta.');
  }
  return text;
}
