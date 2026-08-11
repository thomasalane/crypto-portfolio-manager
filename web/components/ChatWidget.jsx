import { useState, useRef, useEffect } from 'react';
import { ask } from '../lib/api.js';

/**
 * Isolated on purpose: if the model is unavailable the failure stays in this
 * panel and the dashboard behind it keeps working.
 */
export default function ChatWidget({ ready }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [log, setLog] = useState([]);
  const [busy, setBusy] = useState(false);
  const logRef = useRef(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log, busy]);

  const send = async (e) => {
    e.preventDefault();
    const q = question.trim();
    if (!q || busy) return;

    setLog((l) => [...l, { role: 'me', text: q }]);
    setQuestion('');
    setBusy(true);
    try {
      const { answer } = await ask(q);
      setLog((l) => [...l, { role: 'bot', text: answer }]);
    } catch (err) {
      setLog((l) => [...l, { role: 'err', text: err.message }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button className="fab" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {open ? 'Fechar' : 'Perguntar'}
      </button>

      {open && (
        <div className="sheet">
          <div className="sh">
            <span className="cap">Assistente do portfolio</span>
          </div>

          <div className="log" ref={logRef}>
            {log.length === 0 && (
              <p className="empty-note">
                {ready
                  ? 'Pergunte sobre os seus ativos, as metas ou o que o rebalanceamento faria.'
                  : 'O assistente precisa de uma chave da API. Coloque GEMINI_API_KEY no arquivo .env e reinicie o servidor.'}
              </p>
            )}
            {log.map((m, i) => (
              <div key={i} className={`msg ${m.role}`}>
                {m.text}
              </div>
            ))}
            {busy && <div className="msg bot">Pensando…</div>}
          </div>

          <form className="ft" onSubmit={send}>
            <input
              type="text"
              placeholder="Perguntar sobre o portfolio…"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              aria-label="Mensagem"
              disabled={!ready}
            />
            <button className="btn" type="submit" disabled={!ready || busy || !question.trim()}>
              Enviar
            </button>
          </form>
        </div>
      )}
    </>
  );
}
