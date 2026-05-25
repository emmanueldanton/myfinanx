// ═══ Toast — feedback visuel léger + undo suppression (5s) ═══

const DURATION_SUCCESS = 3000;
const DURATION_UNDO    = 5000;

let _timer  = null;
let _undoFn = null;

export function initToast() {
  window.toastUndo = toastUndo;
}

export function showSuccessToast(message) {
  _show(message, 'success', DURATION_SUCCESS, null);
}

export function showUndoToast(message, undoFn) {
  _undoFn = undoFn;
  _show(message, 'undo', DURATION_UNDO, undoFn);
}

export function toastUndo() {
  if (_undoFn) { _undoFn(); _undoFn = null; }
  _dismiss();
}

// ── Internal ──────────────────────────────────────────────────────

function _show(message, type, duration) {
  if (_timer) { clearTimeout(_timer); _timer = null; }

  const wrap = document.getElementById('toast-wrap');
  if (!wrap) return;

  const icoCheck = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
  const icoTrash = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`;

  wrap.innerHTML = `<div class="toast toast-${type}">
    <span class="toast-ico">${type === 'success' ? icoCheck : icoTrash}</span>
    <span class="toast-msg">${message}</span>
    ${type === 'undo' ? `<button class="toast-undo-btn" onclick="toastUndo()">Annuler</button>` : ''}
    ${type === 'undo' ? `<div class="toast-bar" style="animation-duration:${duration}ms"></div>` : ''}
  </div>`;

  wrap.classList.add('show');
  _timer = setTimeout(_dismiss, duration);
}

function _dismiss() {
  _undoFn = null;
  document.getElementById('toast-wrap')?.classList.remove('show');
  if (_timer) { clearTimeout(_timer); _timer = null; }
}
