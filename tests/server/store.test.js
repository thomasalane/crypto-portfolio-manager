import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadPortfolio, savePortfolio, EMPTY_PORTFOLIO } from '../../server/store.js';

let dir;
let file;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'cpm-'));
  file = join(dir, 'portfolio.json');
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('loadPortfolio', () => {
  it('returns an empty portfolio when the file does not exist', () => {
    const { portfolio, warning } = loadPortfolio(file);
    expect(portfolio).toEqual(EMPTY_PORTFOLIO);
    expect(warning).toBeNull();
  });

  it('does not create the file just by reading', () => {
    loadPortfolio(file);
    expect(readdirSync(dir)).toEqual([]);
  });

  it('reads back what was saved', () => {
    const portfolio = {
      version: 1,
      currency: 'usd',
      assets: [{ id: 'a', symbol: 'A', name: 'A', source: 'coingecko', target: 1, quantity: 2, colorSlot: 1, lastPrice: 3, lastPriceAt: null }],
      history: [{ at: '2026-01-01T00:00:00.000Z', total: 6 }],
    };
    savePortfolio(file, portfolio);
    expect(loadPortfolio(file).portfolio).toEqual(portfolio);
  });

  it('quarantines an unparseable file and starts empty', () => {
    writeFileSync(file, '{ this is not json');
    const { portfolio, warning } = loadPortfolio(file);
    expect(portfolio).toEqual(EMPTY_PORTFOLIO);
    expect(warning).toContain('não pôde ser lido');
    const quarantined = readdirSync(dir).filter((f) => f.startsWith('portfolio.corrupted-'));
    expect(quarantined).toHaveLength(1);
  });

  it('preserves the corrupted content in the quarantined copy', () => {
    writeFileSync(file, '{ broken');
    loadPortfolio(file);
    const [name] = readdirSync(dir).filter((f) => f.startsWith('portfolio.corrupted-'));
    expect(readFileSync(join(dir, name), 'utf8')).toBe('{ broken');
  });

  it('quarantines a file whose shape is wrong', () => {
    writeFileSync(file, JSON.stringify({ assets: 'not an array' }));
    const { portfolio, warning } = loadPortfolio(file);
    expect(portfolio).toEqual(EMPTY_PORTFOLIO);
    expect(warning).not.toBeNull();
  });

  it('fills in a missing history array rather than failing', () => {
    writeFileSync(file, JSON.stringify({ version: 1, currency: 'usd', assets: [] }));
    const { portfolio, warning } = loadPortfolio(file);
    expect(portfolio.history).toEqual([]);
    expect(warning).toBeNull();
  });
});

describe('savePortfolio', () => {
  it('writes formatted JSON', () => {
    savePortfolio(file, EMPTY_PORTFOLIO);
    expect(readFileSync(file, 'utf8')).toContain('\n  ');
  });

  it('overwrites an existing file completely', () => {
    savePortfolio(file, { ...EMPTY_PORTFOLIO, history: [{ at: 'x', total: 1 }] });
    savePortfolio(file, EMPTY_PORTFOLIO);
    expect(loadPortfolio(file).portfolio.history).toEqual([]);
  });

  it('leaves no temporary file behind', () => {
    savePortfolio(file, EMPTY_PORTFOLIO);
    expect(readdirSync(dir)).toEqual(['portfolio.json']);
  });
});

describe('savePortfolio backups', () => {
  const withAssets = (quantity) => ({
    ...EMPTY_PORTFOLIO,
    assets: [{ id: 'a', symbol: 'A', name: 'A', source: 'coingecko', target: 1, quantity, colorSlot: 1, lastPrice: 1, lastPriceAt: null }],
  });
  const backup = () => join(dir, 'portfolio.backup.json');

  it('writes no backup when there was nothing to overwrite', () => {
    savePortfolio(file, withAssets(1));
    expect(existsSync(backup())).toBe(false);
  });

  it('keeps the previous content when overwriting', () => {
    savePortfolio(file, withAssets(111));
    savePortfolio(file, withAssets(222));

    expect(JSON.parse(readFileSync(backup(), 'utf8')).assets[0].quantity).toBe(111);
    expect(loadPortfolio(file).portfolio.assets[0].quantity).toBe(222);
  });

  it('keeps only the most recent previous version', () => {
    savePortfolio(file, withAssets(1));
    savePortfolio(file, withAssets(2));
    savePortfolio(file, withAssets(3));

    expect(JSON.parse(readFileSync(backup(), 'utf8')).assets[0].quantity).toBe(2);
  });

  it('does not overwrite the backup when the content is unchanged', () => {
    savePortfolio(file, withAssets(111));
    savePortfolio(file, withAssets(222));
    savePortfolio(file, withAssets(222));

    // A no-op save must not push the real previous version out of the backup.
    expect(JSON.parse(readFileSync(backup(), 'utf8')).assets[0].quantity).toBe(111);
  });

  it('never treats the backup as the portfolio itself', () => {
    savePortfolio(file, withAssets(111));
    savePortfolio(file, withAssets(222));
    expect(loadPortfolio(file).portfolio.assets[0].quantity).toBe(222);
  });
});
