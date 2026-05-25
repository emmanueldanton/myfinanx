// ═══ Goals UI — objectifs d'épargne (onglet Objectifs + vue globale) ═══
import { store }           from '../store.js';
import { bridgeSaveGoals }  from '../data-bridge.js';
import { uid, esc, parseAmt, fmtDate, todayISO } from '../utils.js';
import { fmt, fmtInput, fromDisplay }   from '../currency.js';
import { showSuccessToast, showUndoToast } from './toast.js';

let _gColor = '#4D78D4';

// ── Init ──────────────────────────────────────────────────────────

export function initGoalsUI() {
  window.selC           = selC;
  window.addGoal        = addGoal;
  window.addToGoal      = addToGoal;
  window.delGoal        = delGoal;
  window.toggleEditGoal = toggleEditGoal;
  window.saveEditGoal   = saveEditGoal;

  const ngD = document.getElementById('ng-d');
  if (ngD && !ngD.value) ngD.value = todayISO();
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
  const emptyOv    = `<div class="empty" style="padding:12px">Aucun objectif défini.</div>`;
  const htmlGoals  = goals.map(g => buildGoalCard(g, '')).join('');
  const htmlOv     = goals.map(g => buildGoalCard(g, 'ov-')).join('');
  _setHTML('goals-grid', htmlGoals || emptyGoals);
  _setHTML('ov-goals',   htmlOv    || emptyOv);
}

export function buildGoalCard(g, prefix) {
  const pct    = g.targetEUR > 0 ? Math.min(100, Math.round((g.savedEUR / g.targetEUR) * 100)) : 0;
  const done   = g.savedEUR >= g.targetEUR;
  const badge  = done
    ? `<span class="gbadge gb-d"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-1px"><polyline points="20 6 9 17 4 12"/></svg> Atteint</span>`
    : `<span class="gbadge gb-p">${pct}% · En cours</span>`;
  const clockIco = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;

  if (prefix === 'ov-') {
    return `<div class="gc">
    <div class="gt">
      <div class="gt-left">
        <div class="g-ico" style="background:${g.color}22">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${g.color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
        </div>
        <div style="min-width:0">
          <div class="gn">${esc(g.name)}</div>
          ${g.deadline ? `<div class="gdl">${clockIco} ${fmtDate(g.deadline)}</div>` : ''}
        </div>
      </div>
      <div>${badge}</div>
    </div>
    <div class="pt" style="height:6px;margin-top:10px;"><div class="pf" style="width:${pct}%;background:${g.color}"></div></div>
    <div class="gam">
      <div class="gcur" style="color:${g.color}">${fmt(g.savedEUR)}</div>
      <div class="gtgt">/ ${fmt(g.targetEUR)}</div>
    </div>
  </div>`;
  }

  const inputId = `${prefix}ga-${g.id}`;
  return `<div class="gc">
    <div class="gt">
      <div class="gt-left">
        <div class="g-ico" style="background:${g.color}22">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${g.color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
        </div>
        <div>
          <div class="gn">${esc(g.name)}</div>
          ${g.deadline ? `<div class="gdl">${clockIco} ${fmtDate(g.deadline)}</div>` : ''}
        </div>
      </div>
      <div class="g-ctrl">
        ${badge}
        <button class="g-ed" onclick="toggleEditGoal('${g.id}','${prefix}')" title="Modifier">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="g-del" onclick="delGoal('${g.id}')" title="Supprimer">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>
    <div class="pt" style="height:6px;"><div class="pf" style="width:${pct}%;background:${g.color}"></div></div>
    <div class="gam">
      <div class="gcur" style="color:${g.color}">${fmt(g.savedEUR)}</div>
      <div class="gtgt">/ ${fmt(g.targetEUR)}</div>
    </div>
    <div class="gadd">
      <input type="text" inputmode="decimal" id="${inputId}" placeholder="Ajouter un montant…"
             onkeydown="if(event.key==='Enter')addToGoal('${g.id}','${prefix}')">
      <button class="btn bp bsm" onclick="addToGoal('${g.id}','${prefix}')">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Ajouter
      </button>
    </div>
    <div class="g-edit-form" id="gef-${prefix}${g.id}" style="display:none;">
      <div class="g-edit-row">
        <div class="g-edit-field">
          <div class="g-edit-lbl">Nom de l'objectif</div>
          <input type="text" class="g-edit-name" value="${esc(g.name)}" placeholder="Nom">
        </div>
        <div class="g-edit-field">
          <div class="g-edit-lbl">Échéance</div>
          <input type="date" class="g-edit-dl" value="${g.deadline || ''}">
        </div>
      </div>
      <div class="g-edit-row">
        <div class="g-edit-field">
          <div class="g-edit-lbl">Montant cible</div>
          <input type="text" inputmode="decimal" class="g-edit-target" value="${fmtInput(g.targetEUR)}" placeholder="Cible">
        </div>
        <div class="g-edit-field">
          <div class="g-edit-lbl">Déjà épargné</div>
          <input type="text" inputmode="decimal" class="g-edit-saved" value="${fmtInput(g.savedEUR)}" placeholder="Épargné">
        </div>
      </div>
      <div class="g-edit-actions">
        <button class="btn bp bsm" onclick="saveEditGoal('${g.id}','${prefix}')">Enregistrer</button>
        <button class="btn bsm" onclick="toggleEditGoal('${g.id}','${prefix}')">Annuler</button>
      </div>
    </div>
  </div>`;
}

// ── Color picker ──────────────────────────────────────────────────

export function selC(el) {
  document.querySelectorAll('.sw').forEach(s => s.classList.remove('on'));
  el.classList.add('on');
  _gColor = el.dataset.c;
}

// ── Mutations ─────────────────────────────────────────────────────

export function addGoal() {
  const n = document.getElementById('ng-n').value.trim();
  const t = fromDisplay(parseAmt(document.getElementById('ng-t').value));
  const s = fromDisplay(parseAmt(document.getElementById('ng-c').value));
  const d = document.getElementById('ng-d').value.trim();
  if (!n || t <= 0) return;
  const goals = _goals();
  goals.push({ id: uid(), name: n, targetEUR: t, savedEUR: s, deadline: d, color: _gColor });
  ['ng-n', 'ng-t', 'ng-c'].forEach(i => { document.getElementById(i).value = ''; });
  document.getElementById('ng-d').value = todayISO();
  _mutate(goals);
  showSuccessToast(`Objectif "${n}" créé`);
}

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

export function toggleEditGoal(id, prefix) {
  const form = document.getElementById('gef-' + prefix + id);
  if (!form) return;
  form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

export function saveEditGoal(id, prefix) {
  const goals = _goals();
  const g     = goals.find(g => g.id === id);
  if (!g) return;
  const form = document.getElementById('gef-' + prefix + id);
  if (!form) return;
  const name   = form.querySelector('.g-edit-name').value.trim();
  const target = fromDisplay(parseAmt(form.querySelector('.g-edit-target').value));
  const saved  = fromDisplay(parseAmt(form.querySelector('.g-edit-saved').value));
  const dl     = form.querySelector('.g-edit-dl').value;
  if (!name || target <= 0) return;
  g.name      = name;
  g.targetEUR = target;
  g.savedEUR  = Math.min(saved, target);
  g.deadline  = dl;
  _mutate(goals);
}
