// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { useState } from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NumberField from '../../web/components/NumberField.jsx';

afterEach(cleanup);

/** Mirrors how AssetEditor uses the field: value comes back down from state. */
function Harness({ initial = 60, onValue = () => {} }) {
  const [value, setValue] = useState(initial);
  return (
    <NumberField
      aria-label="meta"
      value={value}
      onChange={(next) => { setValue(next); onValue(next); }}
    />
  );
}

const field = () => screen.getByLabelText('meta');

describe('NumberField', () => {
  it('shows the value it is given', () => {
    render(<Harness initial={60} />);
    expect(field().value).toBe('60');
  });

  it('stays empty when cleared instead of snapping to zero', async () => {
    const user = userEvent.setup();
    render(<Harness initial={60} />);

    await user.clear(field());

    expect(field().value).toBe('');
  });

  it('reports zero to the parent while the field is empty', async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<Harness initial={60} onValue={onValue} />);

    await user.clear(field());

    expect(onValue).toHaveBeenLastCalledWith(0);
  });

  it('does not leave a leading zero after clearing and retyping', async () => {
    const user = userEvent.setup();
    render(<Harness initial={60} />);

    await user.clear(field());
    await user.type(field(), '45');

    // The original bug produced "045" here.
    expect(field().value).toBe('45');
  });

  it('passes the retyped number to the parent', async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<Harness initial={60} onValue={onValue} />);

    await user.clear(field());
    await user.type(field(), '45');

    expect(onValue).toHaveBeenLastCalledWith(45);
  });

  it('spells an empty field as 0 when focus leaves', async () => {
    const user = userEvent.setup();
    render(<Harness initial={60} />);

    await user.clear(field());
    await user.tab();

    expect(field().value).toBe('0');
  });

  it('accepts a decimal point without interrupting typing', async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<Harness initial={0} onValue={onValue} />);

    await user.clear(field());
    await user.type(field(), '12.5');

    expect(field().value).toBe('12.5');
    expect(onValue).toHaveBeenLastCalledWith(12.5);
  });

  it('accepts a comma as the decimal separator', async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<Harness initial={0} onValue={onValue} />);

    await user.clear(field());
    await user.type(field(), '12,5');

    expect(field().value).toBe('12,5');
    expect(onValue).toHaveBeenLastCalledWith(12.5);
  });

  it('keeps a trailing separator on screen while it is being typed', async () => {
    const user = userEvent.setup();
    render(<Harness initial={0} />);

    await user.clear(field());
    await user.type(field(), '7,');

    expect(field().value).toBe('7,');
  });

  it('ignores letters', async () => {
    const user = userEvent.setup();
    render(<Harness initial={0} />);

    await user.clear(field());
    await user.type(field(), '1a2');

    expect(field().value).toBe('12');
  });

  it('ignores a second separator', async () => {
    const user = userEvent.setup();
    render(<Harness initial={0} />);

    await user.clear(field());
    await user.type(field(), '1,2,3');

    expect(field().value).toBe('1,23');
  });

  it('takes a new value pushed down from outside', () => {
    const { rerender } = render(<NumberField aria-label="meta" value={10} onChange={() => {}} />);
    expect(field().value).toBe('10');

    rerender(<NumberField aria-label="meta" value={80} onChange={() => {}} />);
    expect(field().value).toBe('80');
  });

  it('does not rewrite the field when the text still means the same number', async () => {
    const user = userEvent.setup();
    render(<Harness initial={0} />);

    await user.clear(field());
    await user.type(field(), '5,0');

    // 5,0 and 5 are the same number; the text the user typed must survive.
    expect(field().value).toBe('5,0');
  });

  it('shows a numeric keypad on touch devices', () => {
    render(<Harness initial={1} />);
    expect(field().getAttribute('inputmode')).toBe('decimal');
  });
});
