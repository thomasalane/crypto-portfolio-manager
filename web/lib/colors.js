/**
 * Asset colours.
 *
 * The four hues were chosen by running candidates through a colourblind
 * separation validator across every pair, in both themes — four is the largest
 * set that clears the thresholds. Colourblind separation lands in the 6–8 band,
 * which is only valid alongside secondary encoding, so the donut keeps 2px gaps
 * between slices and every value is also written out in the legend table.
 *
 * A slot belongs to an asset for as long as the asset exists. Assets beyond the
 * fourth share the neutral "Outros" slice in the donut, while the deviation bar
 * list — where colour carries no information — shows every one of them.
 */
export const MAX_COLOR_SLOTS = 4;

const SLOTS = {
  light: ['#c6495b', '#95760d', '#018e7d', '#2b7ad6'],
  dark: ['#d05a69', '#a38207', '#0f9b89', '#4087de'],
};

const NEUTRAL = { light: '#3A3E38', dark: '#B0ABA4' };

/**
 * @param {number | null | undefined} slot  1-based, or null for the fold
 * @param {'light' | 'dark'} theme
 * @returns {string} hex colour
 */
export function colorForSlot(slot, theme) {
  const palette = SLOTS[theme] ?? SLOTS.dark;
  if (!Number.isInteger(slot) || slot < 1 || slot > MAX_COLOR_SLOTS) {
    return NEUTRAL[theme] ?? NEUTRAL.dark;
  }
  return palette[slot - 1];
}

/** True when the asset gets its own hue rather than folding into "Outros". */
export const hasOwnColor = (slot) =>
  Number.isInteger(slot) && slot >= 1 && slot <= MAX_COLOR_SLOTS;

export const neutralColor = (theme) => NEUTRAL[theme] ?? NEUTRAL.dark;
