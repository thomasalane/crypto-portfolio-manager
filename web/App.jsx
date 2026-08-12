import { useEffect, useMemo, useState } from 'react';
import { computeState } from '../core/allocation.js';
import { planContribution } from '../core/contribution.js';
import { planRebalance } from '../core/rebalance.js';
import * as api from './lib/api.js';
import Plates from './components/Plates.jsx';
import Donut from './components/Donut.jsx';
import DeviationBars from './components/DeviationBars.jsx';
import ActionDeck from './components/ActionDeck.jsx';
import HistoryChart from './components/HistoryChart.jsx';
import AssetEditor from './components/AssetEditor.jsx';
import ChatWidget from './components/ChatWidget.jsx';

const readTheme = () => document.documentElement.getAttribute('data-theme') ?? 'dark';

export default function App() {
  const [portfolio, setPortfolio] = useState(null);
  const [draft, setDraft] = useState([]);
  const [warning, setWarning] = useState(null);
  const [assistantReady, setAssistantReady] = useState(false);
  const [errors, setErrors] = useState([]);
  const [notice, setNotice] = useState(null);
  const [staleSymbols, setStaleSymbols] = useState([]);
  const [amount, setAmount] = useState('');
  const [theme, setTheme] = useState(readTheme);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [backupAvailable, setBackupAvailable] = useState(false);

  useEffect(() => {
    api
      .getState()
      .then(({ portfolio: p, warning: w, assistantReady: ready, backupAvailable: hasBackup }) => {
        setPortfolio(p);
        setDraft(p.assets);
        setWarning(w);
        setAssistantReady(ready);
        setBackupAvailable(hasBackup);
      })
      .catch((err) => setWarning(err.message))
      .finally(() => setLoading(false));
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    setTheme(next);
  };

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(portfolio?.assets ?? []),
    [draft, portfolio]
  );

  // Saved assets drive the dashboard; the draft only drives the editor.
  const saved = portfolio?.assets ?? [];
  const { total, rows } = useMemo(() => computeState(saved), [saved]);

  const parsedAmount = Number(String(amount).replace(/\./g, '').replace(',', '.')) || 0;
  const contribution = useMemo(
    () => planContribution(saved, parsedAmount),
    [saved, parsedAmount]
  );
  const rebalance = useMemo(() => planRebalance(saved), [saved]);

  const projection = useMemo(
    () => Object.fromEntries(contribution.map((o) => [o.id, o.amount])),
    [contribution]
  );

  const save = async () => {
    setSaving(true);
    setErrors([]);
    try {
      const { portfolio: next } = await api.saveAssets(draft);
      setPortfolio(next);
      setDraft(next.assets);
      setBackupAvailable(true);
      setNotice('Ativos salvos.');
    } catch (err) {
      setErrors(err.message.split(/(?<=\.)\s+/).filter(Boolean));
    } finally {
      setSaving(false);
    }
  };

  const restore = async () => {
    setRestoring(true);
    setErrors([]);
    try {
      const { portfolio: next } = await api.restorePrevious();
      setPortfolio(next);
      setDraft(next.assets);
      setNotice('Versão anterior restaurada. Clique de novo para desfazer.');
    } catch (err) {
      setNotice(err.message);
    } finally {
      setRestoring(false);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    setNotice(null);
    try {
      const { portfolio: next, missing } = await api.refreshPrices();
      setPortfolio(next);
      setDraft(next.assets);
      setStaleSymbols(missing);
      setNotice(
        missing.length > 0
          ? `Preços atualizados. Sem preço para: ${missing.join(', ')}.`
          : 'Preços atualizados.'
      );
    } catch (err) {
      setNotice(err.message);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="app">
        <div className="banner">Carregando…</div>
      </div>
    );
  }

  const hasAssets = saved.length > 0;

  return (
    <>
      <div className="app">
        <div className="top">
          <span className="brand">Portfolio</span>
          <span className="cap num" style={{ letterSpacing: '0.08em' }}>USD</span>
          <span className="grow" />
          <button className="btn icon" onClick={toggleTheme} aria-label="Alternar modo claro e escuro">
            {theme === 'dark' ? '☀' : '☾'}
          </button>
          <button className="btn" onClick={refresh} disabled={refreshing || !hasAssets}>
            {refreshing ? 'Atualizando…' : 'Atualizar preços'}
          </button>
        </div>

        {warning && <div className="banner warn">{warning}</div>}
        {notice && <div className="banner">{notice}</div>}

        {hasAssets ? (
          <>
            <Plates rows={rows} total={total} />
            <Donut rows={rows} total={total} theme={theme} />
            <DeviationBars
              rows={rows}
              total={total}
              theme={theme}
              projection={projection}
              staleSymbols={staleSymbols}
            />
            <ActionDeck
              amount={amount}
              onAmountChange={setAmount}
              contribution={contribution}
              rebalance={rebalance}
            />
            <HistoryChart history={portfolio.history} />
          </>
        ) : (
          <div className="empty">
            <h2>Nenhum ativo ainda</h2>
            <p>
              Comece adicionando um ativo e definindo a meta dele. Você decide quais ativos
              acompanhar e qual porcentagem cada um deve ocupar — nada vem pronto.
            </p>
          </div>
        )}

        <AssetEditor
          assets={draft}
          onChange={setDraft}
          onSave={save}
          onRestore={restore}
          errors={errors}
          saving={saving}
          dirty={dirty}
          theme={theme}
          backupAvailable={backupAvailable}
          restoring={restoring}
        />
      </div>

      <ChatWidget ready={assistantReady} />
    </>
  );
}
