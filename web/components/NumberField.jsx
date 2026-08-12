import { useEffect, useState } from 'react';

/**
 * A numeric input that keeps what the user typed.
 *
 * Deriving the displayed text from the model on every keystroke breaks as soon
 * as the field is cleared: the empty string parses to 0, the field re-renders
 * as "0", and the next digit lands to its right ("05"). React will not tidy
 * that up either — for `type="number"` it only rewrites the DOM when
 * `node.value != value`, and loose equality reads "05" as already equal to 5.
 *
 * So the text is state here, and the number is derived from it. Clearing the
 * field shows an empty field, not a zero.
 */
export default function NumberField({ value, onChange, ...props }) {
  const [draft, setDraft] = useState(() => String(value ?? ''));

  // Re-sync when the value changes from somewhere else — a save, a restore, a
  // price refresh — but leave the draft alone while it still means the same
  // number, so typing is never interrupted.
  useEffect(() => {
    setDraft((current) => (Number(current) === Number(value) ? current : String(value ?? '')));
  }, [value]);

  const handle = (e) => {
    const raw = e.target.value;
    setDraft(raw);
    if (raw.trim() === '') return onChange(0);
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) onChange(parsed);
  };

  // An empty field reads as 0 but shows nothing; on the way out it is spelled.
  const blur = () => setDraft(String(Number(draft) || 0));

  return <input {...props} value={draft} onChange={handle} onBlur={blur} />;
}
