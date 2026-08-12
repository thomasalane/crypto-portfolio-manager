/**
 * Display currency.
 *
 * CoinGecko quotes in both currencies in a single request, so every asset
 * carries a price in each and switching costs nothing — no exchange-rate API,
 * no conversion arithmetic, and no historical rates to guess at. The history
 * likewise stores a total per currency, so past snapshots stay truthful in
 * whichever one is on screen.
 *
 * Pure — no I/O. Shared by the server and the browser.
 */

export const CURRENCIES = ['usd', 'brl'];

export const CURRENCY_META = {
  usd: { code: 'usd', symbol: '$', label: 'USD' },
  brl: { code: 'brl', symbol: 'R$', label: 'BRL' },
};

export const isSupported = (code) => CURRENCIES.includes(code);

/**
 * Resolve each asset's stored per-currency prices down to the single
 * `lastPrice` that the allocation maths expects.
 *
 * @param {Array} assets
 * @param {'usd' | 'brl'} currency
 * @returns {Array} assets with `lastPrice` and `missingPrice` set
 */
export function withPricesIn(assets, currency) {
  return assets.map((a) => {
    const value = a.prices?.[currency];
    const known = typeof value === 'number';
    return { ...a, lastPrice: known ? value : 0, missingPrice: !known };
  });
}

/**
 * Flatten history to `{ at, total }` in one currency. Snapshots taken before
 * that currency existed in the file are left out rather than charted as zero.
 *
 * @param {Array} history
 * @param {'usd' | 'brl'} currency
 */
export function historyIn(history, currency) {
  return history
    .filter((h) => typeof h.totals?.[currency] === 'number')
    .map((h) => ({ at: h.at, total: h.totals[currency] }));
}
