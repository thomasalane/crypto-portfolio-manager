import { colorForSlot } from '../lib/colors.js';
import { money, pct, quantity, dateTime } from '../lib/format.js';

/**
 * One row per asset on a shared 0–100% ruler. The solid bar is what you hold,
 * the hatched band is the distance to the target, and the marker fixes the
 * target itself. Colour is decorative here — every row carries its own label —
 * so there is no cap on how many assets this list shows.
 */
export default function DeviationBars({ rows, total, theme, projection, staleSymbols }) {
  return (
    <div className="sec">
      <h2>Distância até a meta</h2>
      <p className="hint">
        A barra cheia é o que você tem. O hachurado é o que falta — ou o que passou. O marcador ▲
        fixa a meta.
      </p>

      <div className="ruler">
        <div className="rc">Ativo</div>
        <div className="ax">
          <i className="s" style={{ left: 0 }}>0</i>
          <i style={{ left: '25%' }}>25</i>
          <i style={{ left: '50%' }}>50</i>
          <i style={{ left: '75%' }}>75</i>
          <i className="e" style={{ left: '100%' }}>100%</i>
        </div>
        <div className="rc r">Tem · Meta · Falta / Sobra</div>
      </div>

      {rows.map((row) => {
        const actual = Math.max(0, Math.min(1, row.actual));
        const target = Math.max(0, Math.min(1, row.target));
        const gapStart = Math.min(actual, target);
        const gapWidth = Math.abs(actual - target);
        const shortfall = total * row.target - row.value;
        const bought = projection?.[row.id] ?? 0;
        const ghostWidth = shortfall > 0 ? gapWidth * Math.min(1, bought / shortfall) : 0;
        const stale = staleSymbols?.includes(row.symbol);

        return (
          <div className="row" key={row.id}>
            <div>
              <div className="sym">{row.symbol}</div>
              <div className="qt">{quantity(row.quantity)}</div>
              {stale && <div className="stale">preço desatualizado</div>}
            </div>

            <div className="track">
              <div
                className="bar"
                style={{ width: `${actual * 100}%`, background: colorForSlot(row.colorSlot, theme) }}
              />
              {!row.onTarget && (
                <div
                  className="gap"
                  style={{ left: `${gapStart * 100}%`, width: `${gapWidth * 100}%` }}
                />
              )}
              {ghostWidth > 0 && (
                <div
                  className="ghost"
                  style={{ left: `${gapStart * 100}%`, width: `${ghostWidth * 100}%` }}
                />
              )}
              <div className="goal" style={{ left: `${target * 100}%` }} />
            </div>

            <div className="read">
              <b className="num">{pct(row.actual)}%</b>
              <span className="lbl">meta</span>
              <span className="num">{pct(row.target, 0)}%</span>
              {row.onTarget ? (
                <span className="amt on">na meta</span>
              ) : shortfall > 0 ? (
                <span className="amt">falta ${money(shortfall, 0)}</span>
              ) : (
                <span className="amt over">sobra ${money(-shortfall, 0)}</span>
              )}
            </div>
          </div>
        );
      })}

      {rows.some((r) => r.lastPriceAt) && (
        <p className="hint" style={{ margin: '14px 0 0' }}>
          Preços de {dateTime(rows.find((r) => r.lastPriceAt)?.lastPriceAt)}.
        </p>
      )}
    </div>
  );
}
