import { colorForSlot, hasOwnColor, neutralColor } from '../lib/colors.js';
import { cash, pct, points } from '../lib/format.js';

const SIZE = 220;
const CENTER = SIZE / 2;
const OUTER = { r: 76, width: 11 };
const INNER = { r: 58, width: 20 };
const SLICE_GAP = 2; // required secondary encoding — see lib/colors.js

/**
 * Fold every asset past the four colour slots into a single neutral slice, so
 * the donut never shows two hues a colourblind reader cannot separate.
 */
function toSegments(rows, theme) {
  const own = rows.filter((r) => hasOwnColor(r.colorSlot)).sort((a, b) => a.colorSlot - b.colorSlot);
  const rest = rows.filter((r) => !hasOwnColor(r.colorSlot));

  const segments = own.map((r) => ({
    key: r.id,
    label: r.symbol,
    color: colorForSlot(r.colorSlot, theme),
    actual: r.actual,
    target: r.target,
  }));

  if (rest.length > 0) {
    segments.push({
      key: '__outros__',
      label: 'Other',
      color: neutralColor(theme),
      actual: rest.reduce((s, r) => s + r.actual, 0),
      target: rest.reduce((s, r) => s + r.target, 0),
      count: rest.length,
    });
  }
  return segments;
}

function Ring({ segments, field, r, width, opacity }) {
  const circumference = 2 * Math.PI * r;
  let cursor = 0;

  return segments.map((seg) => {
    const length = Math.max(0, seg[field]) * circumference;
    const drawn = Math.max(length - SLICE_GAP, length > 0 ? 0.6 : 0);
    const offset = cursor;
    cursor += length;
    if (drawn <= 0) return null;
    return (
      <circle
        key={seg.key}
        cx={CENTER}
        cy={CENTER}
        r={r}
        fill="none"
        stroke={seg.color}
        strokeWidth={width}
        strokeDasharray={`${drawn} ${circumference - drawn}`}
        strokeDashoffset={-offset}
        opacity={opacity}
      />
    );
  });
}

export default function Donut({ rows, total, theme, currency }) {
  const segments = toSegments(rows, theme);

  return (
    <div className="sec">
      <h2>Where it stands against where you want it</h2>
      <p className="hint">
        Outer ring: the target you set. Inner ring: what you hold today. Wherever the edges do
        not line up, there is a gap.
      </p>

      <div className="split">
        <div>
          <div className="donutwrap">
            <svg
              className="donut"
              width={SIZE}
              height={SIZE}
              viewBox={`0 0 ${SIZE} ${SIZE}`}
              role="img"
              aria-label={`Current allocation compared with the target. ${rows
                .map((r) => `${r.symbol}: today ${pct(r.actual)}%, target ${pct(r.target)}%`)
                .join('. ')}`}
            >
              <g transform={`rotate(-90 ${CENTER} ${CENTER})`}>
                <Ring segments={segments} field="target" r={OUTER.r} width={OUTER.width} opacity={0.55} />
                <Ring segments={segments} field="actual" r={INNER.r} width={INNER.width} opacity={1} />
              </g>
            </svg>
            <div className="hub">
              <div className="cap">Total</div>
              <div className="t num">{cash(total, currency, 0)}</div>
            </div>
          </div>
          <div className="ringkey">
            <span><i className="sw-o" /> target</span>
            <span><i className="sw-i" /> today</span>
          </div>
        </div>

        <table className="legend">
          <thead>
            <tr>
              <th>Asset</th>
              <th>You hold</th>
              <th>Your target</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <span className="chip">
                    <i className="dot" style={{ background: colorForSlot(r.colorSlot, theme) }} />
                    {r.symbol}
                  </span>
                </td>
                <td className="num">{pct(r.actual)}%</td>
                <td className="num">{pct(r.target)}%</td>
                <td className={`st ${r.onTarget ? 'on' : 'off'}`}>
                  {r.onTarget
                    ? 'on target'
                    : `${r.deviation > 0 ? '▲' : '▼'} ${points(r.deviation).replace(/^[+−]/, '')} ${
                        r.deviation > 0 ? 'over' : 'under'
                      }`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
