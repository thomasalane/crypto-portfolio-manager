import { computeState } from './allocation.js';
import { MIN_ORDER } from './contribution.js';

/**
 * Bring every asset to its target by selling what is over and buying what is
 * under. By construction the sells fund the buys exactly; dropping orders
 * below MIN_ORDER breaks that by a small amount, reported as `residual`.
 *
 * @param {Array} assets
 * @returns {{ orders: Array<{ id, symbol, side: 'buy'|'sell', amount: number }>, residual: number }}
 */
export function planRebalance(assets) {
  if (assets.length === 0) return { orders: [], residual: 0 };

  const { total, rows } = computeState(assets);
  if (total <= 0) return { orders: [], residual: 0 };

  const deltas = rows.map((r) => ({ row: r, delta: total * r.target - r.value }));

  const orders = deltas
    .filter((d) => Math.abs(d.delta) >= MIN_ORDER)
    .map(({ row, delta }) => ({
      id: row.id,
      symbol: row.symbol,
      side: delta < 0 ? 'sell' : 'buy',
      amount: Math.abs(delta),
    }))
    .sort((a, b) => {
      if (a.side !== b.side) return a.side === 'sell' ? -1 : 1;
      return b.amount - a.amount;
    });

  const sold = orders.filter((o) => o.side === 'sell').reduce((s, o) => s + o.amount, 0);
  const bought = orders.filter((o) => o.side === 'buy').reduce((s, o) => s + o.amount, 0);

  return { orders, residual: sold - bought };
}
