/** pt-BR display formatting. Rounding happens here and nowhere else. */

export const money = (value, digits = 2) =>
  (Number(value) || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

/** A fraction (0.5) rendered as a percentage string ("50,0"). */
export const pct = (fraction, digits = 1) =>
  ((Number(fraction) || 0) * 100).toLocaleString('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

/** Deviation in percentage points, with an explicit sign. */
export const points = (fraction, digits = 1) => {
  const value = (Number(fraction) || 0) * 100;
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${Math.abs(value).toLocaleString('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
};

/** Quantities need more precision than money — 8 places, trailing zeros cut. */
export const quantity = (value) => {
  const n = Number(value) || 0;
  return n
    .toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 8 });
};

export const dateTime = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

export const dateOnly = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
};
