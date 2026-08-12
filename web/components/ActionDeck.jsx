import { cash, symbolFor } from '../lib/format.js';

function OrderList({ orders, emptyText, currency }) {
  if (orders.length === 0) return <p className="empty-note">{emptyText}</p>;
  return (
    <div className="orders">
      {orders.map((o) => (
        <div className="ord" key={`${o.side}-${o.id}`}>
          <span className={`tag ${o.side}`}>{o.side === 'sell' ? 'Sell' : 'Buy'}</span>
          <span className="s">{o.symbol}</span>
          <span className="a">{cash(o.amount, currency)}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Both money actions side by side. The contribution recalculates in the browser
 * as the user types, using the same core/ functions the server trusts.
 */
export default function ActionDeck({ amount, onAmountChange, contribution, rebalance, currency }) {
  return (
    <div className="deck">
      <div className="cell">
        <h3>Add new money</h3>
        <p className="hint">Buys only. Never touches what you already hold.</p>

        <div className="feed">
          <span className="cur">{symbolFor(currency)}</span>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            aria-label="Contribution amount"
          />
        </div>

        <OrderList
          orders={contribution}
          emptyText="Enter an amount to see what to buy."
          currency={currency}
        />

        {contribution.length > 0 && (
          <p className="hint" style={{ margin: '12px 0 0' }}>
            The green dashes on the bars show where you land after this contribution.
          </p>
        )}
      </div>

      <div className="cell">
        <h3>Rebalance everything</h3>
        <p className="hint">Sells what overshot the target to buy what is missing.</p>

        <OrderList orders={rebalance.orders} emptyText="Everything is already on target. Nothing to do." currency={currency} />

        {Math.abs(rebalance.residual) >= 0.01 && (
          <p className="hint" style={{ margin: '12px 0 0' }}>
            {cash(Math.abs(rebalance.residual), currency)} is left unassigned: orders below{' '}
            {cash(1, currency)} were dropped so you are not left trading small change.
          </p>
        )}
      </div>
    </div>
  );
}
