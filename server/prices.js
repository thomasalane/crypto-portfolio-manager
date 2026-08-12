import { CURRENCIES } from '../core/currency.js';
const BASE = 'https://api.coingecko.com/api/v3';
const MAX_RESULTS = 15;

/** Turn a non-ok response into a message the interface can show as-is. */
function describeFailure(status) {
  if (status === 429) {
    return new Error('A CoinGecko recusou por limite de requisições. Espere um minuto e tente de novo.');
  }
  return new Error(`A CoinGecko não respondeu (erro ${status}). Os preços anteriores foram mantidos.`);
}

/**
 * @param {string} query
 * @param {typeof fetch} fetchImpl
 * @returns {Promise<Array<{ id: string, symbol: string, name: string }>>}
 */
export async function searchAssets(query, fetchImpl = fetch) {
  const q = String(query ?? '').trim();
  if (!q) return [];

  const res = await fetchImpl(`${BASE}/search?query=${encodeURIComponent(q)}`);
  if (!res.ok) throw describeFailure(res.status);

  const body = await res.json();
  const coins = Array.isArray(body?.coins) ? body.coins : [];

  return coins.slice(0, MAX_RESULTS).map((c) => ({
    id: c.id,
    symbol: String(c.symbol ?? '').toUpperCase(),
    name: c.name,
  }));
}

/**
 * One request for every id, quoting every currency at once — CoinGecko returns
 * them all in the same payload, so the display can switch later without another
 * call. Ids absent from the response are left out rather than defaulted, so the
 * caller can mark just those assets as stale.
 *
 * @param {string[]} ids
 * @param {string[]} currencies
 * @param {typeof fetch} fetchImpl
 * @returns {Promise<Record<string, Record<string, number>>>} id → currency → price
 */
export async function fetchPrices(ids, currencies = CURRENCIES, fetchImpl = fetch) {
  if (!ids || ids.length === 0) return {};

  const url =
    `${BASE}/simple/price?ids=${encodeURIComponent(ids.join(','))}` +
    `&vs_currencies=${encodeURIComponent(currencies.join(','))}`;
  const res = await fetchImpl(url);
  if (!res.ok) throw describeFailure(res.status);

  const body = await res.json();
  const prices = {};
  for (const id of ids) {
    const quoted = {};
    for (const currency of currencies) {
      const value = body?.[id]?.[currency];
      if (typeof value === 'number') quoted[currency] = value;
    }
    if (Object.keys(quoted).length > 0) prices[id] = quoted;
  }
  return prices;
}
