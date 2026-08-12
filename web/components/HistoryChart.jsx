import { cash, money, dateOnly } from '../lib/format.js';

/** Value over time, one point per price refresh. */
export default function HistoryChart({ history, currency }) {
  if (history.length < 2) {
    return (
      <div className="sec">
        <h2>Total value over time</h2>
        <p className="hint">
          {history.length === 0
            ? 'No records yet. Refresh prices to start tracking.'
            : 'One record stored. The chart appears from the second one on.'}
        </p>
      </div>
    );
  }

  const values = history.map((h) => h.total);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;

  const points = history.map((h, i) => {
    const x = (i / (history.length - 1)) * 100;
    const y = 38 - ((h.total - min) / span) * 34;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  const first = history[0];
  const last = history[history.length - 1];

  return (
    <div className="sec">
      <h2>Total value over time</h2>
      <p className="hint">One record every time you refresh prices.</p>

      <svg
        className="spark"
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
        role="img"
        aria-label={`Total value across ${history.length} records, from ${money(first.total)} to ${money(last.total)}`}
      >
        <polygon fill="var(--ok)" opacity="0.13" points={`${points.join(' ')} 100,40 0,40`} />
        <polyline
          fill="none"
          stroke="var(--ok)"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={points.join(' ')}
        />
      </svg>

      <div className="sparkfoot">
        <span>
          {history.length} records · since {dateOnly(first.at)}
        </span>
        <span className="num">{cash(last.total, currency)} today</span>
      </div>
    </div>
  );
}
