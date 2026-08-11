import { money } from '../lib/format.js';

function OrderList({ orders, emptyText }) {
  if (orders.length === 0) return <p className="empty-note">{emptyText}</p>;
  return (
    <div className="orders">
      {orders.map((o) => (
        <div className="ord" key={`${o.side}-${o.id}`}>
          <span className={`tag ${o.side}`}>{o.side === 'sell' ? 'Vender' : 'Comprar'}</span>
          <span className="s">{o.symbol}</span>
          <span className="a">${money(o.amount)}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Both money actions side by side. The contribution recalculates in the browser
 * as the user types, using the same core/ functions the server trusts.
 */
export default function ActionDeck({ amount, onAmountChange, contribution, rebalance }) {
  return (
    <div className="deck">
      <div className="cell">
        <h3>Aportar dinheiro novo</h3>
        <p className="hint">Só compra. Não mexe no que você já tem.</p>

        <div className="feed">
          <span className="cur">$</span>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            aria-label="Valor do aporte"
          />
        </div>

        <OrderList
          orders={contribution}
          emptyText="Informe um valor para ver o que comprar."
        />

        {contribution.length > 0 && (
          <p className="hint" style={{ margin: '12px 0 0' }}>
            O tracejado verde nas barras mostra onde você fica depois desse aporte.
          </p>
        )}
      </div>

      <div className="cell">
        <h3>Rebalancear tudo</h3>
        <p className="hint">Vende o que passou da meta para comprar o que falta.</p>

        <OrderList orders={rebalance.orders} emptyText="Tudo já está na meta. Nada a fazer." />

        {Math.abs(rebalance.residual) >= 0.01 && (
          <p className="hint" style={{ margin: '12px 0 0' }}>
            Sobra ${money(Math.abs(rebalance.residual))} sem destino: as ordens menores que $1,00
            foram descartadas para não gerar operação de centavos.
          </p>
        )}
      </div>
    </div>
  );
}
