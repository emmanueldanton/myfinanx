// ═══ Goals UI — objectifs d'épargne (onglet Objectifs + vue globale) ═══
import { store }           from '../store.js';
import { bridgeSaveGoals }  from '../data-bridge.js';
import { uid, esc, parseAmt, fmtDate, todayISO } from '../utils.js';
import { fmt, fmtInput, fromDisplay, getActiveCurrency } from '../currency.js';
import { showSuccessToast, showUndoToast } from './toast.js';

// ── Init ──────────────────────────────────────────────────────────

export function initGoalsUI() {
  window.addToGoal      = addToGoal;
  window.delGoal        = delGoal;
  // Écran dédié Objectif (ajout + édition)
  window.openGoalScreen     = openGoalScreen;
  window.openGoalScreenEdit = openGoalScreenEdit;
  window.selGoalColor       = selGoalColor;
  window.saveGoalScreen     = saveGoalScreen;
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

export function buildGoalCard(g, mode) {
  const pct  = g.targetEUR > 0 ? Math.min(100, Math.round((g.savedEUR / g.targetEUR) * 100)) : 0;
  const done = g.savedEUR >= g.targetEUR;
  const clockIco = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
  const goalIco = (col) => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${col}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`;

  // ── Mode grille (compact) ──
  if (mode === 'grid') {
    return `<div class="gc gc-grid" data-goal-id="${g.id}">
      <div class="gc-grid-top">
        <div class="g-ico" style="background:${g.color}22">${goalIco(g.color)}</div>
        <div class="g-ctrl">
          <button class="g-ed" onclick="openGoalScreenEdit('${g.id}')" title="Modifier"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          <button class="g-del" onclick="delGoal('${g.id}')" title="Supprimer"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
      </div>
      <div class="gc-grid-name">${esc(g.name)}</div>
      <div class="gc-grid-amt" style="color:${g.color}">${fmt(g.savedEUR)}</div>
      <div class="pt" style="height:6px;margin-top:8px;"><div class="pf" style="width:${pct}%;background:${g.color}"></div></div>
      <div class="gc-grid-pct">${pct}%</div>
    </div>`;
  }

  // ── Mode vedette (1er objectif) ──
  const badge = done
    ? `<span class="gbadge gb-d"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-1px"><polyline points="20 6 9 17 4 12"/></svg> Atteint</span>`
    : `<span class="gbadge gb-p">${pct}% · En cours</span>`;
  return `<div class="gc gc-featured" data-goal-id="${g.id}">
    <div class="gt">
      <div class="gt-left">
        <div class="g-ico" style="background:rgba(255,255,255,.16)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg></div>
        <div style="min-width:0">
          <div class="gn">${esc(g.name)}</div>
          ${g.deadline ? `<div class="gdl">${clockIco} ${fmtDate(g.deadline)}</div>` : ''}
        </div>
      </div>
      <div class="g-ctrl">
        ${badge}
        <button class="g-ed" onclick="openGoalScreenEdit('${g.id}')" title="Modifier"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
        <button class="g-del" onclick="delGoal('${g.id}')" title="Supprimer"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      </div>
    </div>
    <div class="gcur-big">${fmt(g.savedEUR)}</div>
    <div class="pt" style="height:8px;margin-top:12px;"><div class="pf" style="width:${pct}%;background:#fff"></div></div>
    <div class="gf-foot">
      <span class="gf-pct">${pct}% complété</span>
      <span class="gf-tgt">Sur ${fmt(g.targetEUR)}</span>
    </div>
    <div class="gadd">
      <input type="text" inputmode="decimal" id="ga-${g.id}" placeholder="Ajouter un montant…" onkeydown="if(event.key==='Enter')addToGoal('${g.id}','')">
      <button class="btn bp bsm" onclick="addToGoal('${g.id}','')"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Ajouter</button>
    </div>
  </div>`;
}

// ── Mutations ─────────────────────────────────────────────────────

export function addToGoal(id, prefix = '') {
  const inp   = document.getElementById(prefix + 'ga-' + id);
  if (!inp) return;
  const errId = prefix + 'ga-err-' + id;
  const a     = fromDisplay(parseAmt(inp.value));
  if (a <= 0) {
    let err = document.getElementById(errId);
    if (!err) {
      err = document.createElement('div');
      err.id = errId;
      err.style.cssText = 'font-size:.7rem;color:var(--red-l);margin-top:3px;';
      inp.parentNode.appendChild(err);
    }
    err.textContent = 'Montant invalide (doit être > 0)';
    setTimeout(() => { const e = document.getElementById(errId); if (e) e.remove(); }, 3000);
    return;
  }
  const existErr = document.getElementById(errId);
  if (existErr) existErr.remove();
  const goals = _goals();
  const g = goals.find(g => g.id === id);
  if (g) { g.savedEUR = Math.min(g.targetEUR, g.savedEUR + a); inp.value = ''; }
  _mutate(goals);
  showSuccessToast(`${fmt(a)} ajouté à l'objectif`);
}

export function delGoal(id) {
  const goals    = _goals();
  const g        = goals.find(x => x.id === id);
  if (!g) return;
  const snapshot = [...goals];
  _mutate(goals.filter(x => x.id !== id));
  showUndoToast(`"${g.name}" supprimé`, () => _mutate(snapshot));
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
