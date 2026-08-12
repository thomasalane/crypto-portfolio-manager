import { useEffect, useState } from 'react';

/**
 * A numeric input that keeps what the user typed.
 *
 * Two problems rule out `type="number"` here. First, deriving the displayed
 * text from the model on every keystroke breaks as soon as the field is
 * cleared: the empty string parses to 0, the field re-renders as "0", and the
 * next digit lands to its right ("05"). React will not tidy that up either —
 * for number inputs it only rewrites the DOM when `node.value != value`, and
 * loose equality reads "05" as already equal to 5. Second, a number input
 * sanitises half-typed values, so "7," never survives long enough to become
 * "7,5".
 *
 * So this is a text field with a numeric keypad: the text is state, the number
 * is derived from it, and both "," and "." work as the decimal separator — the
 * comma is kept while typing and spelled as a dot once focus leaves.
 */

/** Digits with at most one separator — what a half-typed number looks like. */
const ACCEPTED = /^[0-9]*[.,]?[0-9]*$/;

const toNumber = (text) => {
  const normalised = text.replace(',', '.');
  const parsed = Number(normalised);
  return Number.isFinite(parsed) ? parsed : 0;
};

/** The display uses a dot; a typed comma is accepted and normalised on blur. */
const toText = (value) => String(value ?? '');

export default function NumberField({ value, onChange, ...props }) {
  const [draft, setDraft] = useState(() => toText(value));

  // Re-sync when the value changes from somewhere else — a save, a restore, a
  // price refresh — but leave the draft alone while it still means the same
  // number, so typing is never interrupted.
  useEffect(() => {
    setDraft((current) => (toNumber(current) === Number(value) ? current : toText(value)));
  }, [value]);

  const handle = (e) => {
    const raw = e.target.value;
    if (!ACCEPTED.test(raw)) return; // ignore letters, signs, a second separator
    setDraft(raw);
    onChange(raw.trim() === '' ? 0 : toNumber(raw));
  };

  // An empty or half-typed field reads as 0 but shows nothing until focus
  // leaves; on the way out it is spelled properly.
  const blur = () => setDraft(toText(toNumber(draft)));

  return (
    <input
      {...props}
      type="text"
      inputMode="decimal"
      value={draft}
      onChange={handle}
      onBlur={blur}
    />
  );
}
