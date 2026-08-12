import { existsSync, readFileSync, writeFileSync, renameSync, copyFileSync } from 'node:fs';
import { isSupported } from '../core/currency.js';

/** The shape a brand-new install starts from. No assets are ever pre-configured. */
export const EMPTY_PORTFOLIO = Object.freeze({
  version: 2,
  currency: 'usd',
  assets: [],
  history: [],
});

const fresh = () => structuredClone(EMPTY_PORTFOLIO);

/**
 * A file that exists but cannot be trusted is moved aside rather than
 * overwritten — the user's positions are not something to silently discard.
 */
function quarantine(filePath) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const target = filePath.replace(/\.json$/, '') + `.corrupted-${stamp}.json`;
  renameSync(filePath, target);
  return target;
}

/**
 * @param {string} filePath
 * @returns {{ portfolio: object, warning: string | null }}
 */
export function loadPortfolio(filePath) {
  if (!existsSync(filePath)) return { portfolio: fresh(), warning: null };

  let parsed;
  try {
    parsed = JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    const moved = quarantine(filePath);
    return {
      portfolio: fresh(),
      warning: `O arquivo do portfolio não pôde ser lido e foi guardado como ${moved}. Começando vazio.`,
    };
  }

  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.assets)) {
    const moved = quarantine(filePath);
    return {
      portfolio: fresh(),
      warning: `O arquivo do portfolio não pôde ser lido e foi guardado como ${moved}. Começando vazio.`,
    };
  }

  return { portfolio: migrate(parsed), warning: null };
}

/**
 * Version 1 held one price per asset and one total per snapshot, always in USD.
 * Version 2 holds a value per currency so the display can switch without
 * refetching and without inventing historical exchange rates. Files written by
 * version 1 are read forward on load; the new shape is written on the next save.
 */
function migrate(parsed) {
  const assets = parsed.assets.map((a) => {
    if (a.prices && typeof a.prices === 'object') return a;
    const { lastPrice, ...rest } = a;
    return { ...rest, prices: typeof lastPrice === 'number' ? { usd: lastPrice } : {} };
  });

  const rawHistory = Array.isArray(parsed.history) ? parsed.history : [];
  const history = rawHistory.map((h) => {
    if (h.totals && typeof h.totals === 'object') return h;
    const { total, ...rest } = h;
    return { ...rest, totals: typeof total === 'number' ? { usd: total } : {} };
  });

  return {
    version: 2,
    currency: isSupported(parsed.currency) ? parsed.currency : 'usd',
    assets,
    history,
  };
}

/** Where the previous version is parked before every overwrite. */
export const backupPathFor = (filePath) => filePath.replace(/\.json$/, '') + '.backup.json';

/**
 * Write the portfolio, keeping the version it replaced.
 *
 * A single bad write — a mistaken bulk update, a script run against the wrong
 * data — otherwise destroys positions the user typed in by hand and that exist
 * nowhere else. The backup is one step of undo: copy it over portfolio.json.
 *
 * @param {string} filePath
 * @param {object} portfolio
 */
export function savePortfolio(filePath, portfolio) {
  const next = JSON.stringify(portfolio, null, 2) + '\n';

  if (existsSync(filePath)) {
    const current = readFileSync(filePath, 'utf8');
    // An identical save must not push the real previous version out.
    if (current !== next) copyFileSync(filePath, backupPathFor(filePath));
  }

  writeFileSync(filePath, next, 'utf8');
}
