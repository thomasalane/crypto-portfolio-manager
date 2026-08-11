import { describe, it, expect } from 'vitest';
import { planRebalance } from '../../core/rebalance.js';

const asset = (over) => ({
  id: 'a', symbol: 'A', name: 'A', source: 'coingecko',
  target: 0.5, quantity: 1, colorSlot: 1, lastPrice: 100, lastPriceAt: null,
  ...over,
});

const totalOf = (orders, side) =>
  orders.filter((o) => o.side === side).reduce((s, o) => s + o.amount, 0);

describe('planRebalance', () => {
  it('returns nothing for an empty portfolio', () => {
    expect(planRebalance([])).toEqual({ orders: [], residual: 0 });
  });

  it('returns nothing when the portfolio is already on target', () => {
    const assets = [
      asset({ id: 'a', target: 0.5, quantity: 5, lastPrice: 100 }),
      asset({ id: 'b', target: 0.5, quantity: 5, lastPrice: 100 }),
    ];
    expect(planRebalance(assets).orders).toEqual([]);
  });

  it('sells the excess and buys the shortfall', () => {
    // Total 1000. a has 900 but wants 500 → sell 400. b has 100 but wants 500 → buy 400.
    const assets = [
      asset({ id: 'a', symbol: 'A', target: 0.5, quantity: 9, lastPrice: 100 }),
      asset({ id: 'b', symbol: 'B', target: 0.5, quantity: 1, lastPrice: 100 }),
    ];
    const { orders } = planRebalance(assets);
    expect(orders.find((o) => o.id === 'a')).toMatchObject({ side: 'sell' });
    expect(orders.find((o) => o.id === 'a').amount).toBeCloseTo(400, 6);
    expect(orders.find((o) => o.id === 'b')).toMatchObject({ side: 'buy' });
    expect(orders.find((o) => o.id === 'b').amount).toBeCloseTo(400, 6);
  });

  it('balances sells against buys', () => {
    const assets = [
      asset({ id: 'a', target: 0.2, quantity: 8, lastPrice: 100 }),
      asset({ id: 'b', target: 0.5, quantity: 1, lastPrice: 100 }),
      asset({ id: 'c', target: 0.3, quantity: 1, lastPrice: 100 }),
    ];
    const { orders } = planRebalance(assets);
    expect(totalOf(orders, 'sell')).toBeCloseTo(totalOf(orders, 'buy'), 6);
  });

  it('reports all order amounts as positive numbers', () => {
    const assets = [
      asset({ id: 'a', target: 0.2, quantity: 8, lastPrice: 100 }),
      asset({ id: 'b', target: 0.8, quantity: 2, lastPrice: 100 }),
    ];
    for (const o of planRebalance(assets).orders) {
      expect(o.amount).toBeGreaterThan(0);
    }
  });

  it('lists sells before buys', () => {
    const assets = [
      asset({ id: 'a', target: 0.2, quantity: 8, lastPrice: 100 }),
      asset({ id: 'b', target: 0.8, quantity: 2, lastPrice: 100 }),
    ];
    const sides = planRebalance(assets).orders.map((o) => o.side);
    expect(sides.indexOf('sell')).toBeLessThan(sides.indexOf('buy'));
  });

  it('drops orders below the minimum and reports no residual when they cancel out', () => {
    // Total 10000. Each side is off by 0.50 — below MIN_ORDER.
    const assets = [
      asset({ id: 'a', target: 0.5, quantity: 50.005, lastPrice: 100 }),
      asset({ id: 'b', target: 0.5, quantity: 49.995, lastPrice: 100 }),
    ];
    const { orders, residual } = planRebalance(assets);
    expect(orders).toEqual([]);
    expect(residual).toBeCloseTo(0, 6);
  });

  it('reports the residual as the net of the surviving orders', () => {
    const assets = [
      asset({ id: 'a', target: 0.3, quantity: 5, lastPrice: 100 }),
      asset({ id: 'b', target: 0.6999, quantity: 5, lastPrice: 100 }),
      asset({ id: 'c', target: 0.0001, quantity: 0, lastPrice: 100 }),
    ];
    const { orders, residual } = planRebalance(assets);
    const net = totalOf(orders, 'sell') - totalOf(orders, 'buy');
    expect(residual).toBeCloseTo(net, 6);
  });

  it('ignores assets with no price rather than producing NaN', () => {
    const assets = [
      asset({ id: 'a', target: 0.5, quantity: 10, lastPrice: 100 }),
      asset({ id: 'b', target: 0.5, quantity: 10, lastPrice: null }),
    ];
    for (const o of planRebalance(assets).orders) {
      expect(Number.isFinite(o.amount)).toBe(true);
    }
  });

  it('carries the symbol on every order', () => {
    const assets = [
      asset({ id: 'a', symbol: 'AAA', target: 0.2, quantity: 8, lastPrice: 100 }),
      asset({ id: 'b', symbol: 'BBB', target: 0.8, quantity: 2, lastPrice: 100 }),
    ];
    const symbols = planRebalance(assets).orders.map((o) => o.symbol).sort();
    expect(symbols).toEqual(['AAA', 'BBB']);
  });
});
