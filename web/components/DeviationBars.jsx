import { colorForSlot } from '../lib/colors.js';
import { cash, pct, quantity, dateTime } from '../lib/format.js';

/**
 * One row per asset on a shared 0–100% ruler. The solid bar is what you hold,
 * the hatched band is the distance to the target, and the marker fixes the
 * target itself. Colour is decorative here — every row carries its own label —
 * so there is no cap on how many assets this list shows.
 */
export default function DeviationBars({ rows, total, theme, projection, staleSymbols, currency }) {
  return (
    <div className="sec">
      <h2>Distance to target</h2>
      <p className="hint">
        The solid bar is what you hold. The hatched band is what is missing — or what overshot.
        The ▲ marker pins the target.
      </p>

      <div className="ruler">
        <div className="rc">Asset</div>
        <div className="ax">
          <i className="s" style={{ left: 0 }}>0</i>
          <i style={{ left: '25%' }}>25</i>
          <i style={{ left: '50%' }}>50</i>
          <i style={{ left: '75%' }}>75</i>
          <i className="e" style={{ left: '100%' }}>100%</i>
        </div>
        <div className="rc r">Hold · Target · Short / Over</div>
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
              {stale && <div className="stale">price out of date</div>}
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
              <span className="lbl">target</span>
              <span className="num">{pct(row.target, 0)}%</span>
              {row.onTarget ? (
                <span className="amt on">on target</span>
              ) : shortfall > 0 ? (
                <span className="amt">{cash(shortfall, currency, 0)} short</span>
              ) : (
                <span className="amt over">{cash(-shortfall, currency, 0)} over</span>
              )}
            </div>
          </div>
        );
      })}

      {rows.some((r) => r.lastPriceAt) && (
        <p className="hint" style={{ margin: '14px 0 0' }}>
          Prices from {dateTime(rows.find((r) => r.lastPriceAt)?.lastPriceAt)}.
        </p>
      )}
    </div>
  );
}
