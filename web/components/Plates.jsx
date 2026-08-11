import { money, points } from '../lib/format.js';

export default function Plates({ rows, total }) {
  const off = rows.filter((r) => !r.onTarget);
  const behind = [...rows].sort((a, b) => a.deviation - b.deviation)[0];
  const worst = [...rows].sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation))[0];
  const allOnTarget = off.length === 0;

  return (
    <div className="plates">
      <div className="plate">
        <div className="cap">Valor total</div>
        <div className="v num">
          {money(total).split(',')[0]}
          <small>,{money(total).split(',')[1]}</small>
        </div>
        <div className="sub">{rows.length} {rows.length === 1 ? 'ativo' : 'ativos'}</div>
      </div>

      <div className="plate">
        <div className="cap">Fora da meta</div>
        <div className={`v num ${allOnTarget ? 'good' : 'bad'}`}>
          {off.length}
          <small> de {rows.length}</small>
        </div>
        <div className="sub">
          {allOnTarget
            ? 'tudo dentro da meta'
            : `maior desvio: ${worst.symbol}, ${points(worst.deviation)} pontos`}
        </div>
      </div>

      <div className="plate">
        <div className="cap">Comprar primeiro</div>
        <div className="v word">{allOnTarget || behind.deviation >= 0 ? '—' : behind.symbol}</div>
        <div className="sub">
          {allOnTarget || behind.deviation >= 0
            ? 'nenhuma compra necessária'
            : `é o mais atrasado — falta ${points(behind.deviation).replace('−', '')} pontos`}
        </div>
      </div>
    </div>
  );
}
