/** Portfolio shape rules. Pure — no I/O. Messages are user-facing. */

export const TARGET_SUM_TOLERANCE = 0.0001;

const pct = (fraction) =>
  (fraction * 100).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/**
 * @param {Array} assets
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateAssets(assets) {
  const errors = [];

  if (assets.length === 0) return { ok: true, errors };

  const seen = new Set();
  for (const a of assets) {
    const label = a.symbol || a.id || 'an unnamed asset';

    if (!a.id) {
      errors.push('An asset is missing its identifier.');
    } else if (seen.has(a.id)) {
      errors.push(`${label} is listed twice.`);
    } else {
      seen.add(a.id);
    }

    if (!(Number(a.target) >= 0)) {
      errors.push(`The target for ${label} cannot be negative.`);
    }
    if (!(Number(a.quantity) >= 0)) {
      errors.push(`The quantity of ${label} cannot be negative.`);
    }
  }

  const sum = assets.reduce((s, a) => s + (Number(a.target) || 0), 0);
  const diff = sum - 1;
  if (Math.abs(diff) > TARGET_SUM_TOLERANCE) {
    errors.push(
      diff < 0
        ? `Targets add up to ${pct(sum)}%. ${pct(-diff)}% short of 100%.`
        : `Targets add up to ${pct(sum)}%. ${pct(diff)}% over 100%.`
    );
  }

  return { ok: errors.length === 0, errors };
}
