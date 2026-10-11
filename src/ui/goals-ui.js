// ═══ Goals UI — objectifs d'épargne (onglet Objectifs + vue globale) ═══
import { store }           from '../store.js';
import { bridgeSaveGoals }  from '../data-bridge.js';
import { uid, esc, parseAmt, fmtDate, todayISO, focusOnDesktop } from '../utils.js';
import { fmt, fmtInput, fromDisplay, toDisplay, getActiveCurrency } from '../currency.js';
import { showSuccessToast, showUndoToast } from './toast.js';
import { paidInMonth, dueInMonth, leftToPayInMonth, finishMonth, monthsToReach, requiredMonthly } from '../goals.js';
import { MONTHS } from '../utils.js';

// Mois réel (les versements et rappels suivent le calendrier, pas le mois affiché)
function _nowYM() { const n = new Date(); return [n.getFullYear(), n.getMonth()]; }
function _monthName(M) { return MONTHS[M].toLowerCase(); }
function _monthLabel(Y, M) { const [nY] = _nowYM(); return _monthName(M) + (Y !== nY ? ' ' + Y : ''); }
function _hasPlan(g) { return (g.plan === 'monthly' && g.monthlyEUR > 0) || (g.plan === 'once' && !!g.deadline); }

// Objectifs avec un versement encore à faire ce mois-ci : [{ g, left }]
export function goalsDueNow(goals) {
  const [Y, M] = _nowYM();
  return (goals || []).map(g => ({ g, left: leftToPayInMonth(g, Y, M) })).filter(x => x.left > 0.004);
}

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
  window.quickDepositCurrentGoal = quickDepositCurrentGoal;
  window.setGoalPlan         = setGoalPlan;
  window.updateGoalPlanHint  = updateGoalPlanHint;
  window.useRequiredMonthly  = useRequiredMonthly;
}

// ── Helpers ───────────────────────────────────────────────────────

function _goals() {
  return store.get('mfx_goals') || [];
}

function _mutate(goals) {
  store.set('mfx_goals', goals);
  bridgeSaveGoals();
  window.syncGoalReminder?.();   // reprogramme (ou annule) le rappel de fin de mois
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
    return `<div class="gc gc-grid" data-goal-id="${esc(g.id)}" role="button" tabindex="0" onclick="openGoalDetail(this.dataset.goalId)" onkeydown="if(event.key==='Enter')openGoalDetail(this.dataset.goalId)">
      <div class="gc-grid-top">
        <div class="g-ico" style="background:${g.color}22">${goalIco(g.color)}</div>
        <svg class="gc-grid-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m9 5l6 7l-6 7"/></svg>
      </div>
      <div class="gc-grid-name">${esc(g.name)}</div>
      <div class="gc-grid-amt" style="color:${g.color}">${fmt(g.savedEUR)}</div>
      <div class="pt" style="height:6px;margin-top:8px;"><div class="pf" style="width:${pct}%;background:${g.color}"></div></div>
      <div class="gc-grid-pct">${pct}%</div>
      ${_monthLine(g, 'grid')}
    </div>`;
  }

  // ── Mode vedette (objectif épinglé) — carte cliquable vers le détail ──
  const badge = done
    ? `<span class="gbadge gb-d"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-1px"><polyline points="20 6 9 17 4 12"/></svg> Atteint</span>`
    : `<span class="gbadge gb-p">${pct}% · En cours</span>`;
  return `<div class="gc gc-featured" data-goal-id="${esc(g.id)}" role="button" tabindex="0" onclick="openGoalDetail(this.dataset.goalId)" onkeydown="if(event.key==='Enter')openGoalDetail(this.dataset.goalId)">
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
    ${_monthLine(g, 'featured')}
    ${done ? '' : `<div class="gf-cta"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Ajouter de l'épargne</div>`}
  </div>`;
}

// Ligne « ce mois-ci » d'une carte : le versement du mois traité comme un mini-objectif
function _monthLine(g, mode) {
  const [Y, M] = _nowYM();
  const due = dueInMonth(g, Y, M);
  if (!(due > 0)) return '';
  const paid = Math.min(due, paidInMonth(g, Y, M));
  const ok = paid >= due - 0.004;
  if (mode === 'grid') {
    return `<div class="gc-month${ok ? ' is-ok' : ''}">${ok ? '✓ Mois versé' : 'À verser : ' + fmt(due - paid)}</div>`;
  }
  const p = Math.round((paid / due) * 100);
  return `<div class="gf-month">
    <div class="gf-month-top"><span>${ok ? '✓ Versement du mois fait' : 'Versement du mois'}</span><span>${fmt(paid)} / ${fmt(due)}</span></div>
    <div class="gf-month-bar"><div style="width:${p}%"></div></div>
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
    ${_planBlock(g, done)}
    <div class="isc-stats">
      <div class="isc-stat"><span>${done ? 'Objectif atteint' : 'Reste à épargner'}</span><strong>${fmt(reste)}</strong></div>
      <div class="isc-stat"><span>Montant cible</span><strong>${fmt(g.targetEUR)}</strong></div>
    </div>
    ${_depositsBlock(g)}`;
  const inp = document.getElementById('gdc-add');
  const [Y, M] = _nowYM();
  const left = leftToPayInMonth(g, Y, M);
  if (inp) inp.placeholder = left > 0 ? `Montant (${fmt(left)} prévu)` : 'Ajouter un montant…';
}

// Bloc « Ce mois-ci » du détail : progression du versement du mois + résumé du plan
function _planBlock(g, done) {
  const [Y, M] = _nowYM();
  if (!_hasPlan(g)) {
    if (done) return '';
    return `<button class="gpl-cta" onclick="editCurrentGoal()">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      <span><strong>Planifier mes versements</strong><small>Par mois ou en une fois, avec un rappel</small></span>
    </button>`;
  }
  const due  = dueInMonth(g, Y, M);
  const paid = Math.min(due, paidInMonth(g, Y, M));
  const left = Math.max(0, due - paid);
  let planTxt;
  if (g.plan === 'monthly') {
    const fin = finishMonth(g, Y, M);
    const n = monthsToReach(g, Y, M);
    planTxt = `${fmt(g.monthlyEUR)} par mois` + (!done && fin ? ` · fin prévue en ${_monthLabel(fin.Y, fin.M)}${n > 1 ? ` (${n} mois)` : ''}` : '');
  } else {
    const [dy, dm] = g.deadline.split('-').map(Number);
    planTxt = `Paiement en une fois · ${_monthLabel(dy, dm - 1)}`;
  }
  let monthHtml = '';
  if (due > 0) {
    const p = Math.round((paid / due) * 100);
    const lastDay = new Date(Y, M + 1, 0).getDate();
    const cap = _monthName(M).replace(/^./, c => c.toUpperCase());
    monthHtml = `
      <div class="gpl-month-top"><span>${cap}</span><strong>${fmt(paid)} / ${fmt(due)}</strong></div>
      <div class="gpl-bar"><div style="width:${p}%"></div></div>
      ${left > 0
        ? `<div class="gpl-month-sub">Reste ${fmt(left)} à verser avant le ${lastDay} ${_monthName(M)}.</div>
           <button class="gpl-quick" onclick="quickDepositCurrentGoal()">Verser ${fmt(left)}</button>`
        : `<div class="gpl-month-sub is-ok">✓ Versement du mois fait.</div>`}`;
  } else if (!done && g.plan === 'once') {
    monthHtml = `<div class="gpl-month-sub">Rappel à la fin du mois prévu.</div>`;
  }
  return `<div class="gpl-card">
    <div class="gpl-plan">${planTxt}</div>
    ${monthHtml}
  </div>`;
}

function _depositsBlock(g) {
  const list = (g.deposits || []).slice(-5).reverse();
  if (!list.length) return '';
  return `<div class="gpl-hist">
    <div class="gpl-hist-hd">Derniers versements</div>
    ${list.map(x => `<div class="gpl-hist-row"><span>${fmtDate(x.d)}</span><strong>+ ${fmt(x.a)}</strong></div>`).join('')}
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
  inp.value = '';
  _deposit(goals, g, a);
}

// Versement en un geste : le reste prévu pour ce mois
export function quickDepositCurrentGoal() {
  const goals = _goals();
  const g = goals.find(x => x.id === _detailGoalId);
  if (!g) return;
  const [Y, M] = _nowYM();
  const left = leftToPayInMonth(g, Y, M);
  if (left > 0) _deposit(goals, g, left);
}

function _deposit(goals, g, a) {
  const added = Math.max(0, Math.min(g.targetEUR, g.savedEUR + a) - g.savedEUR);
  if (added <= 0) { showSuccessToast('Objectif déjà atteint 🎉'); return; }
  g.savedEUR += added;
  g.deposits = [...(g.deposits || []), { d: todayISO(), a: added }].slice(-60);
  _mutate(goals);
  _renderGoalDetail(g);
  const [Y, M] = _nowYM();
  const monthDone = dueInMonth(g, Y, M) > 0 && leftToPayInMonth(g, Y, M) <= 0.004;
  showSuccessToast(g.savedEUR >= g.targetEUR ? 'Objectif atteint 🎉'
    : monthDone ? `${fmt(added)} versé · mois validé ✓` : `${fmt(added)} ajouté à l'objectif`);
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
  _setVal('gsc-deadline', '');
  _setVal('gsc-monthly', '');
  setGoalPlan('monthly');
  _syncGoalSwatches();
  _setGoalCurSym();
  _setTextG('gsc-title', 'Nouvel objectif');
  _setTextG('gsc-save-lbl', "Créer l'objectif");
  window.openScreen?.('screen-goal');
  focusOnDesktop('gsc-name');
}

export function openGoalScreenEdit(id) {
  const g = _goals().find(x => x.id === id);
  if (!g) return;
  _goalEditId = id;
  _gScrColor  = g.color || '#4D78D4';
  _setVal('gsc-name', g.name || '');
  _setVal('gsc-target', g.targetEUR != null ? fmtInput(g.targetEUR) : '');
  _setVal('gsc-saved', g.savedEUR != null ? fmtInput(g.savedEUR) : '');
  _setVal('gsc-deadline', g.deadline || '');
  _setVal('gsc-monthly', g.monthlyEUR > 0 ? fmtInput(g.monthlyEUR) : '');
  setGoalPlan(g.plan === 'once' ? 'once' : 'monthly');
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
  const monthly = _gPlan === 'monthly' ? fromDisplay(parseAmt(document.getElementById('gsc-monthly')?.value || '')) : 0;
  if (!name || target <= 0) {
    const el = !name ? document.getElementById('gsc-name') : document.getElementById('gsc-target');
    if (el) { el.classList.add('invalid'); setTimeout(() => el.classList.remove('invalid'), 1400); }
    return;
  }
  const goals = _goals();
  if (_goalEditId) {
    const g = goals.find(x => x.id === _goalEditId);
    if (g) { g.name = name; g.targetEUR = target; g.savedEUR = Math.min(saved, target); g.deadline = dl; g.color = _gScrColor; g.plan = _gPlan; g.monthlyEUR = monthly; }
  } else {
    goals.push({ id: uid(), name, targetEUR: target, savedEUR: Math.min(saved, target), deadline: dl, color: _gScrColor, plan: _gPlan, monthlyEUR: monthly, deposits: [] });
  }
  _mutate(goals);
  window.closeScreen?.();
  showSuccessToast(_goalEditId ? 'Objectif modifié' : `Objectif "${name}" créé`);
  _goalEditId = null;
  // Un plan avec rappel : proposer les notifications si elles n'ont jamais été demandées
  if ((monthly > 0 || (_gPlan === 'once' && dl)) && typeof Notification !== 'undefined' && Notification.permission === 'default') {
    setTimeout(() => window.requestPushPermission?.(), 900);
  }
}

// ── Plan de versement (écran Objectif) ──
let _gPlan = 'monthly';

export function setGoalPlan(plan) {
  _gPlan = plan === 'once' ? 'once' : 'monthly';
  document.getElementById('gpl-monthly')?.classList.toggle('on', _gPlan === 'monthly');
  document.getElementById('gpl-once')?.classList.toggle('on', _gPlan === 'once');
  const fld = document.getElementById('gpl-monthly-fld');
  if (fld) fld.hidden = _gPlan !== 'monthly';
  _setTextG('gsc-deadline-lbl', _gPlan === 'once' ? 'Date du paiement' : 'Échéance (facultatif)');
  updateGoalPlanHint();
}

function _formGoal() {
  return {
    targetEUR:  fromDisplay(parseAmt(document.getElementById('gsc-target')?.value || '')),
    savedEUR:   fromDisplay(parseAmt(document.getElementById('gsc-saved')?.value || '')),
    monthlyEUR: fromDisplay(parseAmt(document.getElementById('gsc-monthly')?.value || '')),
    deadline:   document.getElementById('gsc-deadline')?.value || '',
  };
}

// Phrase d'aide sous le plan : date d'arrivée, ou mensualité nécessaire pour l'échéance
export function updateGoalPlanHint() {
  const el = document.getElementById('gpl-hint');
  if (!el) return;
  const f = _formGoal();
  const [Y, M] = _nowYM();
  const useBtn = `<button type="button" class="gpl-use" onclick="useRequiredMonthly()">Mettre ce montant</button>`;
  let html = '';
  if (f.targetEUR > 0 && f.savedEUR < f.targetEUR) {
    if (_gPlan === 'monthly') {
      const req = requiredMonthly(f, Y, M);
      if (f.monthlyEUR > 0) {
        const fin = finishMonth(f, Y, M);
        const n = monthsToReach(f, Y, M);
        html = `Objectif atteint en <strong>${_monthLabel(fin.Y, fin.M)}</strong>${n > 1 ? `, dans ${n} mois` : ''}. Rappel à chaque fin de mois.`;
        if (req && f.monthlyEUR < req - 0.004) html += `<br>Pour l'échéance, il faut <strong>${fmt(req)}</strong> par mois. ${useBtn}`;
      } else if (req) {
        html = `Pour l'échéance : <strong>${fmt(req)}</strong> par mois. ${useBtn}`;
      }
    } else if (f.deadline) {
      const [dy, dm] = f.deadline.split('-').map(Number);
      html = `Rappel fin <strong>${_monthLabel(dy, dm - 1)}</strong> pour verser ${fmt(f.targetEUR - f.savedEUR)}.`;
    } else {
      html = 'Choisis la date du paiement pour recevoir un rappel.';
    }
  }
  el.innerHTML = html;
  el.hidden = !html;
}

export function useRequiredMonthly() {
  const f = _formGoal();
  const [Y, M] = _nowYM();
  const req = requiredMonthly(f, Y, M);
  if (!req) return;
  const inp = document.getElementById('gsc-monthly');
  // Arrondi à l'unité supérieure dans la devise affichée (75 000 CFA, pas 75 002)
  const f10 = 10 ** getActiveCurrency().decimals;
  if (inp) inp.value = String(Math.ceil(toDisplay(req) * f10 - 0.01) / f10).replace('.', ',');
  updateGoalPlanHint();
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
