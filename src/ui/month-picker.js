// ═══ Sélecteur de mois : panneau du bas ouvert depuis la pastille du mois (en-tête) ═══
// Permet de sauter directement à n'importe quel mois passé et de préparer les mois à venir.
import { openOverlay, closeOverlay } from './overlay.js';

const MONTHS_SHORT = ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];
export const FUTURE_MONTHS = 12;   // on peut préparer jusqu'à 12 mois à l'avance

let _getYM = () => { const n = new Date(); return [n.getFullYear(), n.getMonth()]; };
let _viewY = new Date().getFullYear();
let _fromPop = false;

// Mois (index absolu Y*12+M) le plus lointain autorisé dans le futur
export function maxMonthIndex(now = new Date()) {
  return now.getFullYear() * 12 + now.getMonth() + FUTURE_MONTHS;
}

// Mois qui contiennent des données : { 'YYYY-MM': true }
function _monthsWithData() {
  const out = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      const m = /^monargent_(\d{4})_(\d{2})$/.exec(k || '');
      if (!m) continue;
      try {
        const p = JSON.parse(localStorage.getItem(k) || 'null');
        if (p && ((p.expenses || []).length || (p.revenus || []).some(r => r.amount > 0))) out[`${m[1]}-${m[2]}`] = true;
      } catch (e) {}
    }
  } catch (e) {}
  return out;
}

function _minYear(withData) {
  const nowY = new Date().getFullYear();
  const years = Object.keys(withData).map(k => +k.slice(0, 4));
  return Math.min(nowY - 10, ...years);
}

function _el() {
  let ov = document.getElementById('mp-overlay');
  if (ov) return ov;
  ov = document.createElement('div');
  ov.className = 'tuto-overlay mp-overlay';
  ov.id = 'mp-overlay';
  ov.setAttribute('role', 'dialog');
  ov.setAttribute('aria-modal', 'true');
  ov.setAttribute('aria-label', 'Choisir un mois');
  ov.addEventListener('click', e => { if (e.target === ov) closeMonthPicker(); });
  ov.innerHTML = `<div class="tuto-card mp-card">
    <button class="tuto-close" onclick="closeMonthPicker()" aria-label="Fermer">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
    <div class="mp-title">Choisir un mois</div>
    <div class="mp-year">
      <button class="mp-ynav" id="mp-yprev" onclick="mpYear(-1)" aria-label="Année précédente">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="m15 5l-6 7l6 7"/></svg>
      </button>
      <div class="mp-ylbl" id="mp-ylbl"></div>
      <button class="mp-ynav" id="mp-ynext" onclick="mpYear(1)" aria-label="Année suivante">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="m9 5l6 7l-6 7"/></svg>
      </button>
    </div>
    <div class="mp-grid" id="mp-grid"></div>
    <button class="mp-today" id="mp-today" onclick="mpPick(-1)">Revenir au mois actuel</button>
  </div>`;
  document.body.appendChild(ov);
  return ov;
}

function _render() {
  const [selY, selM] = _getYM();
  const now = new Date();
  const nowIdx = now.getFullYear() * 12 + now.getMonth();
  const maxIdx = maxMonthIndex(now);
  const withData = _monthsWithData();
  const minY = _minYear(withData);

  document.getElementById('mp-ylbl').textContent = _viewY;
  document.getElementById('mp-yprev').disabled = _viewY <= minY;
  document.getElementById('mp-ynext').disabled = _viewY * 12 + 12 > maxIdx;

  document.getElementById('mp-grid').innerHTML = MONTHS_SHORT.map((lbl, m) => {
    const idx = _viewY * 12 + m;
    const key = `${_viewY}-${String(m + 1).padStart(2, '0')}`;
    const cls = ['mp-m'];
    if (_viewY === selY && m === selM) cls.push('is-sel');
    if (idx === nowIdx) cls.push('is-now');
    if (idx > nowIdx) cls.push('is-future');
    const dis = idx > maxIdx ? ' disabled' : '';
    const dot = withData[key] ? '<span class="mp-dot" aria-hidden="true"></span>' : '';
    const label = `${lbl} ${_viewY}${idx === nowIdx ? ', mois actuel' : ''}`;
    return `<button class="${cls.join(' ')}" onclick="mpPick(${idx})" aria-label="${label}"${dis}>${lbl}${dot}</button>`;
  }).join('');

  const today = document.getElementById('mp-today');
  today.hidden = selY * 12 + selM === nowIdx;
}

export function openMonthPicker() {
  const [Y] = _getYM();
  _viewY = Y;
  _el();
  _render();
  openOverlay('mp-overlay');
  // Retour système : ferme le panneau au lieu de quitter l'app
  history.pushState({ sheet: 'month' }, '');
}

export function closeMonthPicker() {
  const ov = document.getElementById('mp-overlay');
  if (!ov || !ov.classList.contains('open')) return;
  closeOverlay('mp-overlay');
  if (!_fromPop && history.state?.sheet === 'month') history.back();
}

function _year(d) { _viewY += d; _render(); }

// idx = mois absolu (Y*12+M), -1 = mois actuel
function _pick(idx) {
  const now = new Date();
  if (idx < 0) idx = now.getFullYear() * 12 + now.getMonth();
  const [Y, M] = _getYM();
  const delta = idx - (Y * 12 + M);
  closeMonthPicker();
  if (delta) window.changeMonth?.(delta);
}

export function initMonthPicker(getYM) {
  if (getYM) _getYM = getYM;
  window.openMonthPicker  = openMonthPicker;
  window.closeMonthPicker = closeMonthPicker;
  window.mpYear = _year;
  window.mpPick = _pick;
  window.addEventListener('popstate', () => {
    const ov = document.getElementById('mp-overlay');
    if (ov?.classList.contains('open') && history.state?.sheet !== 'month') {
      _fromPop = true; closeMonthPicker(); _fromPop = false;
    }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMonthPicker(); });
}
