import { describe, it, expect } from 'vitest';
import { planContribution, MIN_ORDER } from '../../core/contribution.js';

const asset = (over) => ({
  id: 'a', symbol: 'A', name: 'A', source: 'coingecko',
  target: 0.5, quantity: 1, colorSlot: 1, lastPrice: 100, lastPriceAt: null,
  ...over,
});

const sum = (orders) => orders.reduce((s, o) => s + o.amount, 0);

describe('planContribution', () => {
  it('returns nothing for an empty portfolio', () => {
    expect(planContribution([], 500)).toEqual([]);
  });

  it('returns nothing when the amount is zero', () => {
    expect(planContribution([asset()], 0)).toEqual([]);
  });

  it('returns nothing when the amount is negative', () => {
    expect(planContribution([asset()], -100)).toEqual([]);
  });

  it('spends the whole amount', () => {
    const assets = [
      asset({ id: 'a', target: 0.5, quantity: 8, lastPrice: 100 }),
      asset({ id: 'b', target: 0.5, quantity: 2, lastPrice: 100 }),
    ];
    expect(sum(planContribution(assets, 500))).toBeCloseTo(500, 6);
  });

  it('buys nothing for an asset already above its target', () => {
    const assets = [
      asset({ id: 'over', symbol: 'OVER', target: 0.1, quantity: 9, lastPrice: 100 }),
      asset({ id: 'under', symbol: 'UNDER', target: 0.9, quantity: 1, lastPrice: 100 }),
    ];
    const orders = planContribution(assets, 500);
    expect(orders.find((o) => o.id === 'over')).toBeUndefined();
    expect(orders.find((o) => o.id === 'under').amount).toBeCloseTo(500, 6);
  });

  it('splits proportionally to how much each asset is short', () => {
    // Total 1000. New total 1500. Targets: a wants 750 (has 900, short 0),
    // b wants 450 (has 100, short 350), c wants 300 (has 0, short 300).
    const assets = [
      asset({ id: 'a', target: 0.5, quantity: 9, lastPrice: 100 }),
      asset({ id: 'b', target: 0.3, quantity: 1, lastPrice: 100 }),
      asset({ id: 'c', target: 0.2, quantity: 0, lastPrice: 100 }),
    ];
    const orders = planContribution(assets, 500);
    const b = orders.find((o) => o.id === 'b').amount;
    const c = orders.find((o) => o.id === 'c').amount;
    expect(b / c).toBeCloseTo(350 / 300, 6);
    expect(b + c).toBeCloseTo(500, 6);
  });

  it('never shrinks an order when the contribution grows', () => {
    // Not linear: each shortfall is measured against the NEW total, which the
    // contribution itself moves. Monotonicity is the property that holds.
    const assets = [
      asset({ id: 'a', target: 0.5, quantity: 9, lastPrice: 100 }),
      asset({ id: 'b', target: 0.3, quantity: 1, lastPrice: 100 }),
      asset({ id: 'c', target: 0.2, quantity: 0, lastPrice: 100 }),
    ];
    const small = planContribution(assets, 200);
    const big = planContribution(assets, 400);
    for (const s of small) {
      const b = big.find((o) => o.id === s.id);
      expect(b.amount).toBeGreaterThan(s.amount);
    }
  });

  it('moves every under-target asset closer to its target', () => {
    const assets = [
      asset({ id: 'a', target: 0.5, quantity: 9, lastPrice: 100 }),
      asset({ id: 'b', target: 0.3, quantity: 1, lastPrice: 100 }),
      asset({ id: 'c', target: 0.2, quantity: 0, lastPrice: 100 }),
    ];
    const amount = 500;
    const orders = planContribution(assets, amount);
    const newTotal = 1000 + amount;

    for (const a of assets) {
      const before = (a.quantity * a.lastPrice) / 1000;
      const bought = orders.find((o) => o.id === a.id)?.amount ?? 0;
      const after = (a.quantity * a.lastPrice + bought) / newTotal;
      if (before < a.target) {
        expect(Math.abs(after - a.target)).toBeLessThan(Math.abs(before - a.target));
      }
    }
  });

  it('fills every shortfall then spreads the surplus by target weight', () => {
    // Total 100, all in a. Amount 900 → new total 1000.
    // a wants 500 (has 100, short 400), b wants 500 (has 0, short 500). Total short 900.
    const assets = [
      asset({ id: 'a', target: 0.5, quantity: 1, lastPrice: 100 }),
      asset({ id: 'b', target: 0.5, quantity: 0, lastPrice: 100 }),
    ];
    const orders = planContribution(assets, 900);
    expect(orders.find((o) => o.id === 'a').amount).toBeCloseTo(400, 6);
    expect(orders.find((o) => o.id === 'b').amount).toBeCloseTo(500, 6);
  });

  it('spreads by target weight when every asset is already at or above target', () => {
    // A portfolio exactly on target has no shortfall at the current total, but
    // adding money creates one proportional to the targets.
    const assets = [
      asset({ id: 'a', target: 0.5, quantity: 5, lastPrice: 100 }),
      asset({ id: 'b', target: 0.5, quantity: 5, lastPrice: 100 }),
    ];
    const orders = planContribution(assets, 400);
    expect(orders.find((o) => o.id === 'a').amount).toBeCloseTo(200, 6);
    expect(orders.find((o) => o.id === 'b').amount).toBeCloseTo(200, 6);
  });

  it('works from an empty portfolio by falling back to target weights', () => {
    const assets = [
      asset({ id: 'a', target: 0.7, quantity: 0, lastPrice: 100 }),
      asset({ id: 'b', target: 0.3, quantity: 0, lastPrice: 100 }),
    ];
    const orders = planContribution(assets, 1000);
    expect(orders.find((o) => o.id === 'a').amount).toBeCloseTo(700, 6);
    expect(orders.find((o) => o.id === 'b').amount).toBeCloseTo(300, 6);
  });

  it('drops orders below the minimum', () => {
    const assets = [
      asset({ id: 'big', target: 0.999, quantity: 0, lastPrice: 100 }),
      asset({ id: 'tiny', target: 0.001, quantity: 0, lastPrice: 100 }),
    ];
    const orders = planContribution(assets, 100);
    expect(orders.find((o) => o.id === 'tiny')).toBeUndefined();
  });

  it('sorts orders from largest to smallest', () => {
    const assets = [
      asset({ id: 'a', target: 0.2, quantity: 0, lastPrice: 100 }),
      asset({ id: 'b', target: 0.5, quantity: 0, lastPrice: 100 }),
      asset({ id: 'c', target: 0.3, quantity: 0, lastPrice: 100 }),
    ];
    const amounts = planContribution(assets, 1000).map((o) => o.amount);
    expect(amounts).toEqual([...amounts].sort((x, y) => y - x));
  });

  it('labels every order as a buy and carries the symbol', () => {
    const orders = planContribution([asset({ symbol: 'ABC', target: 1, quantity: 0 })], 100);
    expect(orders[0]).toMatchObject({ side: 'buy', symbol: 'ABC' });
  });

  it('exports the minimum order size', () => {
    expect(MIN_ORDER).toBe(1);
  });
});
