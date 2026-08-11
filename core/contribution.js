import { computeState } from './allocation.js';

/** Orders smaller than this are not worth placing. Display-currency units. */
export const MIN_ORDER = 1;

/**
 * Distribute new money across the assets that sit below their target, in
 * proportion to how much each one is short. Nothing is ever sold.
 *
 * Proportional rather than sequential: every under-target asset advances at
 * once instead of the most-behind one being filled first. Note this is NOT
 * linear in `amount` — each shortfall is measured against the new total, which
 * the contribution itself moves — but it is monotonic: a larger contribution
 * never produces a smaller order for any asset.
 *
 * @param {Array} assets
 * @param {number} amount  new money, in the display currency
 * @returns {Array<{ id: string, symbol: string, side: 'buy', amount: number }>}
 */
export function planContribution(assets, amount) {
  if (!(amount > 0) || assets.length === 0) return [];

  const { total, rows } = computeState(assets);
  const newTotal = total + amount;

  const shortfalls = rows.map((r) => ({
    row: r,
    short: Math.max(0, newTotal * r.target - r.value),
  }));
  const shortTotal = shortfalls.reduce((s, x) => s + x.short, 0);
  const targetTotal = rows.reduce((s, r) => s + r.target, 0) || 1;

  let allocations;
  if (shortTotal <= 0) {
    // Already at or above target everywhere — spread by target weight.
    allocations = shortfalls.map(({ row }) => ({
      row,
      amount: amount * (row.target / targetTotal),
    }));
  } else if (shortTotal <= amount) {
    // Cover every shortfall, then spread the surplus by target weight.
    const surplus = amount - shortTotal;
    allocations = shortfalls.map(({ row, short }) => ({
      row,
      amount: short + surplus * (row.target / targetTotal),
    }));
  } else {
    allocations = shortfalls.map(({ row, short }) => ({
      row,
      amount: amount * (short / shortTotal),
    }));
  }

  return allocations
    .filter((a) => a.amount >= MIN_ORDER)
    .sort((a, b) => b.amount - a.amount)
    .map(({ row, amount: value }) => ({
      id: row.id,
      symbol: row.symbol,
      side: 'buy',
      amount: value,
    }));
}
