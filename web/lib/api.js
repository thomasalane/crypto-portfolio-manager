/** Thin wrappers over the server API. Every failure surfaces a Portuguese message. */

async function call(url, init) {
  let res;
  try {
    res = await fetch(url, init);
  } catch {
    throw new Error('Não foi possível falar com o servidor. Ele ainda está rodando?');
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error ?? body.errors?.join(' ') ?? `Erro ${res.status}.`);
  }
  return body;
}

export const getState = () => call('/api/state');

export const saveAssets = (assets) =>
  call('/api/assets', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assets }),
  });

export const refreshPrices = () => call('/api/refresh', { method: 'POST' });

export const restorePrevious = () => call('/api/restore', { method: 'POST' });

export const searchAssets = (q) => call(`/api/search?q=${encodeURIComponent(q)}`);

export const ask = (question) =>
  call('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });
