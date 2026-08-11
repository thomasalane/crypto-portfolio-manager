import { describe, it, expect } from 'vitest';
import { computeState, ON_TARGET_EPSILON } from '../../core/allocation.js';

const asset = (over) => ({
  id: 'x', symbol: 'X', name: 'X', source: 'coingecko',
  target: 0.5, quantity: 1, colorSlot: 1, lastPrice: 100, lastPriceAt: null,
  ...over,
});

describe('computeState', () => {
  it('returns zero total and no rows for an empty portfolio', () => {
    expect(computeState([])).toEqual({ total: 0, rows: [] });
  });

  it('multiplies quantity by price to get each value', () => {
    const { rows } = computeState([asset({ quantity: 0.07, lastPrice: 95000 })]);
    expect(rows[0].value).toBeCloseTo(6650, 10);
  });

  it('sums values into the total', () => {
    const { total } = computeState([
      asset({ id: 'a', quantity: 2, lastPrice: 100, target: 0.5 }),
      asset({ id: 'b', quantity: 1, lastPrice: 300, target: 0.5 }),
    ]);
    expect(total).toBeCloseTo(500, 10);
  });

  it('expresses actual as a fraction of the total', () => {
    const { rows } = computeState([
      asset({ id: 'a', quantity: 2, lastPrice: 100, target: 0.5 }),
      asset({ id: 'b', quantity: 1, lastPrice: 300, target: 0.5 }),
    ]);
    expect(rows[0].actual).toBeCloseTo(0.4, 10);
    expect(rows[1].actual).toBeCloseTo(0.6, 10);
  });

  it('reports deviation as actual minus target', () => {
    const { rows } = computeState([
      asset({ id: 'a', quantity: 2, lastPrice: 100, target: 0.5 }),
      asset({ id: 'b', quantity: 1, lastPrice: 300, target: 0.5 }),
    ]);
    expect(rows[0].deviation).toBeCloseTo(-0.1, 10);
    expect(rows[1].deviation).toBeCloseTo(0.1, 10);
  });

  it('gives every row an actual of 0 when the total is 0', () => {
    const { total, rows } = computeState([asset({ quantity: 0 })]);
    expect(total).toBe(0);
    expect(rows[0].actual).toBe(0);
    expect(rows[0].deviation).toBeCloseTo(-0.5, 10);
  });

  it('treats a missing price as zero value rather than NaN', () => {
    const { rows } = computeState([asset({ lastPrice: null })]);
    expect(rows[0].value).toBe(0);
    expect(rows[0].price).toBe(0);
  });

  it('marks an asset on target when the deviation is within the epsilon', () => {
    const { rows } = computeState([asset({ target: 1, quantity: 1, lastPrice: 100 })]);
    expect(rows[0].onTarget).toBe(true);
  });

  it('marks an asset off target when the deviation exceeds the epsilon', () => {
    const { rows } = computeState([
      asset({ id: 'a', target: 0.5, quantity: 1, lastPrice: 100 }),
      asset({ id: 'b', target: 0.5, quantity: 1, lastPrice: 900 }),
    ]);
    expect(rows[0].onTarget).toBe(false);
  });

  it('exports the on-target epsilon as half a percentage point', () => {
    expect(ON_TARGET_EPSILON).toBe(0.005);
  });

  it('preserves identity fields on each row', () => {
    const { rows } = computeState([
      asset({ id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', colorSlot: 3 }),
    ]);
    expect(rows[0]).toMatchObject({ id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', colorSlot: 3 });
  });
});
