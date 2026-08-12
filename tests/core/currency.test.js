import { describe, it, expect } from 'vitest';
import {
  CURRENCIES, CURRENCY_META, withPricesIn, historyIn, isSupported,
} from '../../core/currency.js';

const asset = (over) => ({
  id: 'a', symbol: 'A', name: 'A', source: 'coingecko',
  target: 1, quantity: 2, colorSlot: 1,
  prices: { usd: 100, brl: 520 },
  lastPriceAt: null,
  ...over,
});

describe('currency metadata', () => {
  it('supports exactly usd and brl', () => {
    expect(CURRENCIES).toEqual(['usd', 'brl']);
  });

  it('carries a symbol for each currency', () => {
    expect(CURRENCY_META.usd.symbol).toBe('$');
    expect(CURRENCY_META.brl.symbol).toBe('R$');
  });

  it('recognises supported codes and rejects others', () => {
    expect(isSupported('brl')).toBe(true);
    expect(isSupported('eur')).toBe(false);
    expect(isSupported(undefined)).toBe(false);
  });
});

describe('withPricesIn', () => {
  it('picks the price for the requested currency', () => {
    const [a] = withPricesIn([asset()], 'brl');
    expect(a.lastPrice).toBe(520);
  });

  it('picks a different price for the other currency', () => {
    const [a] = withPricesIn([asset()], 'usd');
    expect(a.lastPrice).toBe(100);
  });

  it('yields zero when the asset has no price in that currency', () => {
    const [a] = withPricesIn([asset({ prices: { usd: 100 } })], 'brl');
    expect(a.lastPrice).toBe(0);
  });

  it('flags an asset that has no price in the requested currency', () => {
    const [missing] = withPricesIn([asset({ prices: { usd: 100 } })], 'brl');
    const [present] = withPricesIn([asset()], 'brl');
    expect(missing.missingPrice).toBe(true);
    expect(present.missingPrice).toBe(false);
  });

  it('leaves every other field untouched', () => {
    const [a] = withPricesIn([asset({ symbol: 'ZZZ', quantity: 7 })], 'usd');
    expect(a).toMatchObject({ symbol: 'ZZZ', quantity: 7, target: 1, colorSlot: 1 });
  });

  it('handles an asset with no prices object at all', () => {
    const [a] = withPricesIn([asset({ prices: undefined })], 'usd');
    expect(a.lastPrice).toBe(0);
    expect(a.missingPrice).toBe(true);
  });

  it('returns an empty list for no assets', () => {
    expect(withPricesIn([], 'usd')).toEqual([]);
  });
});

describe('historyIn', () => {
  const history = [
    { at: '2026-01-01T00:00:00.000Z', totals: { usd: 100, brl: 520 } },
    { at: '2026-01-02T00:00:00.000Z', totals: { usd: 110, brl: 570 } },
  ];

  it('reads the totals for the requested currency', () => {
    expect(historyIn(history, 'brl')).toEqual([
      { at: '2026-01-01T00:00:00.000Z', total: 520 },
      { at: '2026-01-02T00:00:00.000Z', total: 570 },
    ]);
  });

  it('drops entries with no total in that currency rather than showing zero', () => {
    const mixed = [
      { at: 'x', totals: { usd: 100 } },
      { at: 'y', totals: { usd: 110, brl: 570 } },
    ];
    expect(historyIn(mixed, 'brl')).toEqual([{ at: 'y', total: 570 }]);
  });

  it('returns an empty list for no history', () => {
    expect(historyIn([], 'usd')).toEqual([]);
  });
});
