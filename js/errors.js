// Foutenlogboek: de laatste 20 fouten blijven bewaard in de browser, zodat een ouder
// ze op het ouderscherm kan bekijken en kopiëren. Dit bestand wordt als eerste geladen.

const KEY = 'jippecraft.errors.v1';
const MAX = 20;

export function getErrors() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(list) ? list : [];
  } catch { return []; }
}

export function clearErrors() {
  try { localStorage.removeItem(KEY); } catch { /* niet erg */ }
}

export function logError(err, where = '') {
  const msg = String(err?.stack || err?.message || err || 'onbekende fout').slice(0, 600);
  const list = getErrors();
  const last = list[list.length - 1];
  // Dezelfde fout elk beeldje opnieuw: één keer bewaren is genoeg
  if (last && last.msg === msg) { last.n = (last.n || 1) + 1; last.t = Date.now(); } else list.push({ t: Date.now(), msg, where });
  try { localStorage.setItem(KEY, JSON.stringify(list.slice(-MAX))); } catch { /* opslag vol: niet erg */ }
}

window.addEventListener('error', (e) => logError(e.error || e.message, e.filename ? `${e.filename}:${e.lineno}` : ''));
window.addEventListener('unhandledrejection', (e) => logError(e.reason, 'promise'));
