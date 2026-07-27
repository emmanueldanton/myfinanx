// ═══ Goals UI — objectifs d'épargne (onglet Objectifs + vue globale) ═══
import { store }           from '../store.js';
import { bridgeSaveGoals }  from '../data-bridge.js';
import { uid, esc, parseAmt, fmtDate, todayISO } from '../utils.js';
import { fmt, fmtInput, fromDisplay, getActiveCurrency } from '../currency.js';
import { showSuccessToast, showUndoToast } from './toast.js';

// ── Init ──────────────────────────────────────────────────────────

export function initGoalsUI() {
  window.delGoal        = delGoal;
  window.pinGoal        = pinGoal;
  // Écran dédié Objectif (ajout + édition)
  window.openGoalScreen     = openGoalScreen;
  window.openGoalScreenEdit = openGoalScreenEdit;
  window.selGoalColor       = selGoalColor;
  window.saveGoalScreen     = saveGoalScreen;
  // Écran de détail (visualisation + ajout de fonds + menu options)
  window.openGoalDetail      = openGoalDetail;
  window.editCurrentGoal     = editCurrentGoal;
  window.pinCurrentGoal      = pinCurrentGoal;
  window.deleteCurrentGoal   = deleteCurrentGoal;
  window.addFundsCurrentGoal = addFundsCurrentGoal;
}

// ── Helpers ───────────────────────────────────────────────────────

function _goals() {
  return store.get('mfx_goals') || [];
}

function _mutate(goals) {
  store.set('mfx_goals', goals);
  bridgeSaveGoals();
}

function _setHTML(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

// ── Render ────────────────────────────────────────────────────────

export function renderGoals(state) {
  const goals = state?.goals ?? [];
  const emptyGoals = `<div class="empty"><div class="empty-ico"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg></div>Aucun objectif. Crée le premier !</div>`;
  let html = '';
  if (!goals.length) {
    html = emptyGoals;
  } else {
    html = buildGoalCard(goals[0], 'featured');
    if (goals.length > 1) {
      html += `<div class="sec-hd" style="margin-top:18px;"><span class="sec-lbl">Autres projets</span></div>`;
      html += `<div class="goals-2col">` + goals.slice(1).map(g => buildGoalCard(g, 'grid')).join('') + `</div>`;
    }
  }
  _setHTML('goals-grid', html);
  // #ov-goals n'existe plus sur l'accueil épuré — nettoyage défensif
  _setHTML('ov-goals', '');
}

const PIN_ICO = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4h6"/><path d="M10 4v6l-3 3v2h10v-2l-3-3V4"/><line x1="12" y1="18" x2="12" y2="22"/></svg>';

export function buildGoalCard(g, mode) {
  const pct  = g.targetEUR > 0 ? Math.min(100, Math.round((g.savedEUR / g.targetEUR) * 100)) : 0;
  const done = g.savedEUR >= g.targetEUR;
  const clockIco = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
  const goalIco = (col) => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${col}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`;

  // ── Mode grille (compact) — carte cliquable vers le détail ──
  if (mode === 'grid') {
    return `<div class="gc gc-grid" data-goal-id="${g.id}" role="button" tabindex="0" onclick="openGoalDetail('${g.id}')">
      <div class="gc-grid-top">
        <div class="g-ico" style="background:${g.color}22">${goalIco(g.color)}</div>
        <svg class="gc-grid-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m9 5l6 7l-6 7"/></svg>
      </div>
      <div class="gc-grid-name">${esc(g.name)}</div>
      <div class="gc-grid-amt" style="color:${g.color}">${fmt(g.savedEUR)}</div>
      <div class="pt" style="height:6px;margin-top:8px;"><div class="pf" style="width:${pct}%;background:${g.color}"></div></div>
      <div class="gc-grid-pct">${pct}%</div>
    </div>`;
  }

  // ── Mode vedette (objectif épinglé) — carte cliquable vers le détail ──
  const badge = done
    ? `<span class="gbadge gb-d"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-1px"><polyline points="20 6 9 17 4 12"/></svg> Atteint</span>`
    : `<span class="gbadge gb-p">${pct}% · En cours</span>`;
  return `<div class="gc gc-featured" data-goal-id="${g.id}" role="button" tabindex="0" onclick="openGoalDetail('${g.id}')">
    <div class="gt">
      <div class="gt-left">
        <div class="g-ico" style="background:rgba(255,255,255,.16)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg></div>
        <div style="min-width:0">
          <div class="gn">${esc(g.name)} <span class="g-pinned-tag" title="Objectif épinglé">${PIN_ICO}</span></div>
          ${g.deadline ? `<div class="gdl">${clockIco} ${fmtDate(g.deadline)}</div>` : ''}
        </div>
      </div>
      <div class="g-ctrl">${badge}</div>
    </div>
    <div class="gcur-big">${fmt(g.savedEUR)}</div>
    <div class="pt" style="height:8px;margin-top:12px;"><div class="pf" style="width:${pct}%;background:#fff"></div></div>
    <div class="gf-foot">
      <span class="gf-pct">${pct}% complété</span>
      <span class="gf-tgt">Sur ${fmt(g.targetEUR)}</span>
    </div>
  </div>`;
}

// ── Mutations ─────────────────────────────────────────────────────

// Épingle un objectif tout en haut (devient la carte vedette = goals[0])
export function pinGoal(id) {
  const goals = _goals();
  const idx = goals.findIndex(g => g.id === id);
  if (idx <= 0) return;   // déjà épinglé ou introuvable
  const [g] = goals.splice(idx, 1);
  goals.unshift(g);
  _mutate(goals);
  showSuccessToast(`"${g.name}" épinglé en haut`);
}

export function delGoal(id) {
  const goals    = _goals();
  const g        = goals.find(x => x.id === id);
  if (!g) return;
  const snapshot = [...goals];
  _mutate(goals.filter(x => x.id !== id));
  showUndoToast(`"${g.name}" supprimé`, () => _mutate(snapshot));
}

// ── Écran de détail d'un objectif (visualisation + ajout de fonds) ──
let _detailGoalId = null;

export function openGoalDetail(id) {
  const g = _goals().find(x => x.id === id);
  if (!g) return;
  _detailGoalId = id;
  _renderGoalDetail(g);
  _setVal('gdc-add', '');
  window.openScreen?.('screen-goal-detail');
}

function _renderGoalDetail(g) {
  const cont = document.getElementById('gdc-content');
  if (!cont) return;
  const pct   = g.targetEUR > 0 ? Math.min(100, Math.round((g.savedEUR / g.targetEUR) * 100)) : 0;
  const done  = g.savedEUR >= g.targetEUR;
  const reste = Math.max(0, g.targetEUR - g.savedEUR);
  const col   = g.color || 'var(--pr)';
  const targetIco = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>';
  cont.innerHTML = `
    <div class="isc-hero">
      <div class="isc-ico" style="color:${col};background:color-mix(in srgb, ${col} 14%, var(--s1));border:1px solid color-mix(in srgb, ${col} 26%, var(--b1))">${targetIco}</div>
      <div class="isc-name">${esc(g.name)}</div>
      ${g.deadline ? `<div class="isc-sub">Échéance : ${fmtDate(g.deadline)}</div>` : ''}
      <div class="isc-amt" style="color:${col}">${fmt(g.savedEUR)}</div>
      <div class="isc-amt-lbl">épargné sur ${fmt(g.targetEUR)}</div>
    </div>
    <div class="isc-usage">
      <div class="isc-usage-top"><span>${pct}% complété</span>${done ? '<span style="color:var(--green)">Objectif atteint 🎉</span>' : ''}</div>
      <div class="isc-bar"><div class="isc-bar-fill" style="width:${pct}%;background:${col}"></div></div>
    </div>
    <div class="isc-stats">
      <div class="isc-stat"><span>${done ? 'Objectif atteint' : 'Reste à épargner'}</span><strong>${fmt(reste)}</strong></div>
      <div class="isc-stat"><span>Montant cible</span><strong>${fmt(g.targetEUR)}</strong></div>
    </div>`;
}

export function editCurrentGoal()  { if (_detailGoalId) openGoalScreenEdit(_detailGoalId); }
export function pinCurrentGoal()   { if (_detailGoalId) pinGoal(_detailGoalId); }
export function deleteCurrentGoal() {
  if (!_detailGoalId) return;
  const id = _detailGoalId;
  window.closeScreen?.();
  delGoal(id);
}
export function addFundsCurrentGoal() {
  const inp = document.getElementById('gdc-add');
  if (!inp || !_detailGoalId) return;
  const a = fromDisplay(parseAmt(inp.value));
  if (a <= 0) { inp.classList.add('invalid'); setTimeout(() => inp.classList.remove('invalid'), 1400); return; }
  const goals = _goals();
  const g = goals.find(x => x.id === _detailGoalId);
  if (!g) return;
  g.savedEUR = Math.min(g.targetEUR, g.savedEUR + a);
  inp.value = '';
  _mutate(goals);
  _renderGoalDetail(g);
  showSuccessToast(`${fmt(a)} ajouté à l'objectif`);
}

// ── Écran dédié Objectif (ajout + édition) ────────────────────────
let _gScrColor  = '#4D78D4';
let _goalEditId = null;

export function openGoalScreen() {
  _goalEditId = null;
  _gScrColor  = '#4D78D4';
  _setVal('gsc-name', '');
  _setVal('gsc-target', '');
  _setVal('gsc-saved', '');
  _setVal('gsc-deadline', todayISO());
  _syncGoalSwatches();
  _setGoalCurSym();
  _setTextG('gsc-title', 'Nouvel objectif');
  _setTextG('gsc-save-lbl', "Créer l'objectif");
  window.openScreen?.('screen-goal');
  setTimeout(() => document.getElementById('gsc-name')?.focus(), 60);
}

export function openGoalScreenEdit(id) {
  const g = _goals().find(x => x.id === id);
  if (!g) return;
  _goalEditId = id;
  _gScrColor  = g.color || '#4D78D4';
  _setVal('gsc-name', g.name || '');
  _setVal('gsc-target', g.targetEUR != null ? fmtInput(g.targetEUR) : '');
  _setVal('gsc-saved', g.savedEUR != null ? fmtInput(g.savedEUR) : '');
  _setVal('gsc-deadline', g.deadline || todayISO());
  _syncGoalSwatches();
  _setGoalCurSym();
  _setTextG('gsc-title', "Modifier l'objectif");
  _setTextG('gsc-save-lbl', 'Enregistrer');
  window.openScreen?.('screen-goal');
}

export function selGoalColor(el) {
  _gScrColor = el.dataset.c;
  _syncGoalSwatches();
}

export function saveGoalScreen() {
  const name   = (document.getElementById('gsc-name')?.value || '').trim();
  const target = fromDisplay(parseAmt(document.getElementById('gsc-target')?.value || ''));
  const saved  = fromDisplay(parseAmt(document.getElementById('gsc-saved')?.value || ''));
  const dl     = document.getElementById('gsc-deadline')?.value || '';
  if (!name || target <= 0) {
    const el = !name ? document.getElementById('gsc-name') : document.getElementById('gsc-target');
    if (el) { el.classList.add('invalid'); setTimeout(() => el.classList.remove('invalid'), 1400); }
    return;
  }
  const goals = _goals();
  if (_goalEditId) {
    const g = goals.find(x => x.id === _goalEditId);
    if (g) { g.name = name; g.targetEUR = target; g.savedEUR = Math.min(saved, target); g.deadline = dl; g.color = _gScrColor; }
  } else {
    goals.push({ id: uid(), name, targetEUR: target, savedEUR: Math.min(saved, target), deadline: dl, color: _gScrColor });
  }
  _mutate(goals);
  window.closeScreen?.();
  showSuccessToast(_goalEditId ? 'Objectif modifié' : `Objectif "${name}" créé`);
  _goalEditId = null;
}

function _syncGoalSwatches() {
  document.querySelectorAll('#screen-goal .gsw').forEach(s => s.classList.toggle('on', s.dataset.c === _gScrColor));
  // Le hero reflète la couleur choisie de l'objectif
  const ico = document.getElementById('gsc-hero-ico');
  if (ico) {
    ico.style.color = _gScrColor;
    ico.style.background = `color-mix(in srgb, ${_gScrColor} 14%, var(--s1))`;
    ico.style.borderColor = `color-mix(in srgb, ${_gScrColor} 26%, var(--b1))`;
  }
}
function _setGoalCurSym() {
  const sym = getActiveCurrency().symbol;
  document.querySelectorAll('#screen-goal .scr-cur').forEach(el => { el.textContent = sym; });
}
function _setVal(id, v)  { const el = document.getElementById(id); if (el) el.value = v; }
function _setTextG(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }
