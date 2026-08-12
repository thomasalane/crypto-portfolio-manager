/** pt-BR display formatting. Rounding happens here and nowhere else. */
import { CURRENCY_META } from '../../core/currency.js';

export const symbolFor = (currency) => CURRENCY_META[currency]?.symbol ?? '$';

/** Money with its currency symbol, e.g. "$1.234,56" or "R$ 6.420,00". */
export const cash = (value, currency, digits = 2) => {
  const symbol = symbolFor(currency);
  const space = symbol === 'R$' ? ' ' : '';
  return `${symbol}${space}${money(value, digits)}`;
};

/** A price with its symbol, decimals scaled to the magnitude. */
export const cashPrice = (value, currency) => {
  const symbol = symbolFor(currency);
  const space = symbol === 'R$' ? ' ' : '';
  return `${symbol}${space}${price(value)}`;
};

export const money = (value, digits = 2) =>
  (Number(value) || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

/**
 * Prices span many orders of magnitude — $63.940 and $0,00000004 both show up.
 * Pick the decimals from the magnitude so small coins do not read as zero.
 */
export const price = (value) => {
  const n = Number(value) || 0;
  if (n === 0) return '0,00';
  const digits = n >= 1 ? 2 : n >= 0.01 ? 4 : 8;
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: digits });
};

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
