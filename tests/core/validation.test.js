import { describe, it, expect } from 'vitest';
import { validateAssets, TARGET_SUM_TOLERANCE } from '../../core/validation.js';

const asset = (over) => ({
  id: 'a', symbol: 'A', name: 'A', source: 'coingecko',
  target: 1, quantity: 1, colorSlot: 1, lastPrice: 1, lastPriceAt: null,
  ...over,
});

describe('validateAssets', () => {
  it('accepts an empty portfolio', () => {
    expect(validateAssets([])).toEqual({ ok: true, errors: [] });
  });

  it('accepts targets that sum to exactly 1', () => {
    const result = validateAssets([
      asset({ id: 'a', target: 0.5 }),
      asset({ id: 'b', target: 0.5 }),
    ]);
    expect(result.ok).toBe(true);
  });

  it('accepts targets within the tolerance of 1', () => {
    const result = validateAssets([
      asset({ id: 'a', target: 0.33333 }),
      asset({ id: 'b', target: 0.33333 }),
      asset({ id: 'c', target: 0.33338 }),
    ]);
    expect(result.ok).toBe(true);
  });

  it('rejects targets that sum to less than 1 and says how much is missing', () => {
    const result = validateAssets([asset({ target: 0.9 })]);
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('10,0');
  });

  it('rejects targets that sum to more than 1', () => {
    const result = validateAssets([
      asset({ id: 'a', target: 0.8 }),
      asset({ id: 'b', target: 0.4 }),
    ]);
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('20,0');
  });

  it('rejects a negative target', () => {
    const result = validateAssets([
      asset({ id: 'a', target: -0.1 }),
      asset({ id: 'b', target: 1.1 }),
    ]);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('negativa'))).toBe(true);
  });

  it('rejects a negative quantity', () => {
    const result = validateAssets([asset({ quantity: -1 })]);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('negativa'))).toBe(true);
  });

  it('rejects duplicate ids', () => {
    const result = validateAssets([
      asset({ id: 'same', target: 0.5 }),
      asset({ id: 'same', target: 0.5 }),
    ]);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('repetido'))).toBe(true);
  });

  it('rejects an asset with no id', () => {
    const result = validateAssets([asset({ id: '' })]);
    expect(result.ok).toBe(false);
  });

  it('reports every problem at once rather than stopping at the first', () => {
    const result = validateAssets([
      asset({ id: 'dup', target: 0.5, quantity: -1 }),
      asset({ id: 'dup', target: 0.9 }),
    ]);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });

  it('exports the tolerance', () => {
    expect(TARGET_SUM_TOLERANCE).toBe(0.0001);
  });
});
