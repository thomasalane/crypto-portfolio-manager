import { cash, money, dateOnly } from '../lib/format.js';

/** Value over time, one point per price refresh. */
export default function HistoryChart({ history, currency }) {
  if (history.length < 2) {
    return (
      <div className="sec">
        <h2>Evolução do valor total</h2>
        <p className="hint">
          {history.length === 0
            ? 'Nenhum registro ainda. Atualize os preços para começar a acompanhar.'
            : 'Um registro guardado. O gráfico aparece a partir do segundo.'}
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
      <h2>Evolução do valor total</h2>
      <p className="hint">Um registro a cada vez que você atualiza os preços.</p>

      <svg
        className="spark"
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
        role="img"
        aria-label={`Valor total ao longo de ${history.length} registros, de ${money(first.total)} a ${money(last.total)} dólares`}
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
          {history.length} registros · desde {dateOnly(first.at)}
        </span>
        <span className="num">{cash(last.total, currency)} hoje</span>
      </div>
    </div>
  );
}
