import { cash, points } from '../lib/format.js';

export default function Plates({ rows, total, currency }) {
  const off = rows.filter((r) => !r.onTarget);
  const behind = [...rows].sort((a, b) => a.deviation - b.deviation)[0];
  const worst = [...rows].sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation))[0];
  const allOnTarget = off.length === 0;

  return (
    <div className="plates">
      <div className="plate">
        <div className="cap">Total value</div>
        <div className="v num">{cash(total, currency)}</div>
        <div className="sub">{rows.length} {rows.length === 1 ? 'asset' : 'assets'}</div>
      </div>

      <div className="plate">
        <div className="cap">Off target</div>
        <div className={`v num ${allOnTarget ? 'good' : 'bad'}`}>
          {off.length}
          <small> of {rows.length}</small>
        </div>
        <div className="sub">
          {allOnTarget
            ? 'everything within target'
            : `widest gap: ${worst.symbol}, ${points(worst.deviation)} points`}
        </div>
      </div>

      <div className="plate">
        <div className="cap">Buy first</div>
        <div className="v word">{allOnTarget || behind.deviation >= 0 ? '—' : behind.symbol}</div>
        <div className="sub">
          {allOnTarget || behind.deviation >= 0
            ? 'nothing to buy'
            : `furthest behind — ${points(behind.deviation).replace('−', '')} points short`}
        </div>
      </div>
    </div>
  );
}
