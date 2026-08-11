/** Portfolio shape rules. Pure — no I/O. Messages are user-facing Portuguese. */

export const TARGET_SUM_TOLERANCE = 0.0001;

const pct = (fraction) =>
  (fraction * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/**
 * @param {Array} assets
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateAssets(assets) {
  const errors = [];

  if (assets.length === 0) return { ok: true, errors };

  const seen = new Set();
  for (const a of assets) {
    const label = a.symbol || a.id || 'ativo sem nome';

    if (!a.id) {
      errors.push('Um ativo está sem identificador.');
    } else if (seen.has(a.id)) {
      errors.push(`O ativo ${label} está repetido.`);
    } else {
      seen.add(a.id);
    }

    if (!(Number(a.target) >= 0)) {
      errors.push(`A meta de ${label} não pode ser negativa.`);
    }
    if (!(Number(a.quantity) >= 0)) {
      errors.push(`A quantidade de ${label} não pode ser negativa.`);
    }
  }

  const sum = assets.reduce((s, a) => s + (Number(a.target) || 0), 0);
  const diff = sum - 1;
  if (Math.abs(diff) > TARGET_SUM_TOLERANCE) {
    errors.push(
      diff < 0
        ? `As metas somam ${pct(sum)}%. Falta ${pct(-diff)}% para fechar em 100%.`
        : `As metas somam ${pct(sum)}%. Sobra ${pct(diff)}% para fechar em 100%.`
    );
  }

  return { ok: errors.length === 0, errors };
}
