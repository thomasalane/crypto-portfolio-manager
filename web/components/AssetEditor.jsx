import { useState } from 'react';
import { colorForSlot } from '../lib/colors.js';
import { searchAssets } from '../lib/api.js';
import { pct, price } from '../lib/format.js';

/**
 * Everything about which assets exist and what they are aiming at. Nothing is
 * pre-configured — the list starts empty and the user fills it.
 */
export default function AssetEditor({ assets, onChange, onSave, errors, saving, dirty, theme }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  const targetSum = assets.reduce((s, a) => s + (Number(a.target) || 0), 0);
  const closed = Math.abs(targetSum - 1) <= 0.0001;

  const patch = (id, changes) =>
    onChange(assets.map((a) => (a.id === id ? { ...a, ...changes } : a)));

  const remove = (id) => onChange(assets.filter((a) => a.id !== id));

  const add = (found) => {
    if (assets.some((a) => a.id === found.id)) return;
    const priced = typeof found.price === 'number';
    onChange([
      ...assets,
      {
        id: found.id,
        symbol: found.symbol,
        name: found.name,
        source: found.source ?? 'coingecko',
        target: 0,
        quantity: 0,
        colorSlot: undefined,
        // The search already quoted it, so the asset arrives priced.
        lastPrice: priced ? found.price : found.source === 'manual' ? 0 : null,
        lastPriceAt: priced ? new Date().toISOString() : null,
      },
    ]);
    setQuery('');
    setResults([]);
  };

  const runSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSearchError(null);
    try {
      const { results: found } = await searchAssets(query);
      setResults(found);
      if (found.length === 0) setSearchError('Nada encontrado na CoinGecko com esse nome.');
    } catch (err) {
      setSearchError(err.message);
    } finally {
      setSearching(false);
    }
  };

  const addManual = () => {
    const name = query.trim();
    if (!name) return;
    const id = `manual-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    add({ id, symbol: name.toUpperCase().slice(0, 8), name, source: 'manual' });
  };

  return (
    <div className="sec">
      <div className="sec-head">
        <div className="grow">
          <h2>Seus ativos e suas metas</h2>
          <p className="hint">
            As metas precisam somar 100%. Ativos manuais são para o que não existe na CoinGecko —
            você informa o preço.
          </p>
        </div>
        <button className="btn" onClick={onSave} disabled={!dirty || saving}>
          {saving ? 'Salvando…' : 'Salvar'}
        </button>
      </div>

      {assets.length > 0 && (
        <table className="assets">
          <thead>
            <tr>
              <th>Ativo</th>
              <th>Meta (%)</th>
              <th>Quantidade</th>
              <th>Preço</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {assets.map((a) => (
              <tr key={a.id}>
                <td>
                  <span className="chip">
                    <i className="dot" style={{ background: colorForSlot(a.colorSlot, theme) }} />
                    {a.symbol}
                  </span>
                  <div className="qt" style={{ color: 'var(--ink-soft)', fontSize: 11 }}>
                    {a.name}
                    {a.source === 'manual' ? ' · manual' : ''}
                  </div>
                </td>
                <td>
                  <input
                    className="narrow"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={Number((a.target * 100).toFixed(4))}
                    onChange={(e) => patch(a.id, { target: (Number(e.target.value) || 0) / 100 })}
                    aria-label={`Meta de ${a.symbol} em porcentagem`}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={a.quantity}
                    onChange={(e) => patch(a.id, { quantity: Number(e.target.value) || 0 })}
                    aria-label={`Quantidade de ${a.symbol}`}
                  />
                </td>
                <td>
                  {a.source === 'manual' ? (
                    <input
                      className="narrow"
                      type="number"
                      min="0"
                      step="any"
                      value={a.lastPrice ?? 0}
                      onChange={(e) => patch(a.id, { lastPrice: Number(e.target.value) || 0 })}
                      aria-label={`Preço de ${a.symbol}`}
                    />
                  ) : (
                    <span className="num" style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                      {a.lastPrice ? `$${price(a.lastPrice)}` : '—'}
                    </span>
                  )}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn quiet" onClick={() => remove(a.id)} aria-label={`Remover ${a.symbol}`}>
                    Remover
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {assets.length > 0 && (
        <div className="sum-line">
          <span className="cap">Soma das metas</span>
          <span className={`num ${closed ? 'good' : 'bad'}`}>{pct(targetSum)}%</span>
          {!closed && (
            <span className="bad">
              {targetSum < 1
                ? `falta ${pct(1 - targetSum)}%`
                : `sobra ${pct(targetSum - 1)}%`}
            </span>
          )}
        </div>
      )}

      {errors?.length > 0 && (
        <ul className="errors">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      <form className="search-wrap" onSubmit={runSearch}>
        <input
          type="search"
          placeholder="Buscar um ativo para adicionar…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar ativo"
        />
        <div className="sum-line" style={{ marginTop: 10 }}>
          <button className="btn" type="submit" disabled={searching || !query.trim()}>
            {searching ? 'Buscando…' : 'Buscar'}
          </button>
          <button className="btn quiet" type="button" onClick={addManual} disabled={!query.trim()}>
            Adicionar como manual
          </button>
        </div>

        {searchError && <p className="errors">{searchError}</p>}

        {results.length > 0 && (
          <div className="results">
            {results.map((r) => (
              <button type="button" key={r.id} onClick={() => add(r)}>
                <span className="rs">{r.symbol}</span>
                <span className="rn">{r.name}</span>
                <span className="rp num">
                  {typeof r.price === 'number'
                    ? `$${price(r.price)}`
                    : 'sem cotação'}
                </span>
              </button>
            ))}
          </div>
        )}
      </form>
    </div>
  );
}
