import { existsSync, readFileSync, writeFileSync, renameSync } from 'node:fs';

/** The shape a brand-new install starts from. No assets are ever pre-configured. */
export const EMPTY_PORTFOLIO = Object.freeze({
  version: 1,
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

  return {
    portfolio: {
      version: parsed.version ?? 1,
      currency: parsed.currency ?? 'usd',
      assets: parsed.assets,
      history: Array.isArray(parsed.history) ? parsed.history : [],
    },
    warning: null,
  };
}

/** @param {string} filePath @param {object} portfolio */
export function savePortfolio(filePath, portfolio) {
  writeFileSync(filePath, JSON.stringify(portfolio, null, 2) + '\n', 'utf8');
}
