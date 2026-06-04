// ═══ Budget UI — revenue sources + budget items (onglet Budget) ═══
import { store }      from '../store.js';
import { bridgeSave } from '../data-bridge.js';
import { uid, esc, parseAmt, catIco, COLS } from '../utils.js';
import { fmt, fmtInput, fromDisplay }       from '../currency.js';
import { showSuccessToast, showUndoToast }  from './toast.js';

// Injected by initBudgetUI — returns [Y, M] of the active month
let _getYM = () => { const n = new Date(); return [n.getFullYear(), n.getMonth()]; };


// ── Init (call from src/main.js) ───────────────────────────────────

export function initBudgetUI(getYM) {
  _getYM = getYM;
  window.addRev    = addRev;
  window.delRev    = delRev;
  window.editRev   = editRev;
  window.saveRev   = saveRev;
  window.cancelRev = cancelRev;
  window.addBud    = addBud;
  window.delBud    = delBud;
  window.editBud   = editBud;
  window.saveBud   = saveBud;
  window.cancelBud = cancelBud;
}

// ── Helpers ───────────────────────────────────────────────────────

function _budget() {
  return store.get('mfx_budget') ?? { incomes: [], budgetItems: [] };
}

// Commit budget + persist, then re-render. Used by add / delete / save-edit —
// never on every keystroke (édition validée par bouton, pas de commit live).
function _mutate(b) {
  store.set('mfx_budget', b);
  const [Y, M] = _getYM();
  bridgeSave(Y, M);
}

function _setText(id, v) {
  const el = document.getElementById(id);
  if (el) el.textContent = v;
}

// ── Row action buttons (édition / valider / annuler / supprimer) ──
const ICO = {
  edit:   '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
  save:   '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  cancel: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  del:    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>',
};

function _rowActions(prefix, id) {
  return `<div class="row-acts">
      <button class="r-edit"   onclick="edit${prefix}('${id}')"   title="Modifier">${ICO.edit}</button>
      <button class="r-save"   onclick="save${prefix}('${id}')"   title="Valider">${ICO.save}</button>
      <button class="r-cancel" onclick="cancel${prefix}('${id}')" title="Annuler">${ICO.cancel}</button>
      <button class="r-del"    onclick="del${prefix}('${id}')"    title="Supprimer">${ICO.del}</button>
    </div>`;
}

// ── Render ────────────────────────────────────────────────────────

export function renderRevRows(state) {
  const el = document.getElementById('rev-rows');
  if (!el) return;
  const incomes = state?.budget?.incomes ?? [];
  el.innerHTML = incomes.map((r, i) => {
    const col = COLS[i % COLS.length];
    return `<div class="rev-row" data-rev-id="${r.id}">
      <div class="rn">
        <span class="row-view-txt">${esc(r.name)}</span>
        <input type="text" value="${esc(r.name)}" placeholder="Source">
      </div>
      <div class="ra">
        <span class="row-view-txt amt" style="color:${col}">${fmt(r.amountEUR ?? 0)}</span>
        <input type="text" inputmode="decimal" value="${fmtInput(r.amountEUR)}" style="color:${col}">
      </div>
      ${_rowActions('Rev', r.id)}
    </div>`;
  }).join('');
}

export function renderBudRows(state) {
  const el = document.getElementById('bud-rows');
  if (!el) return;
  const budget = state?.budget ?? { incomes: [], budgetItems: [] };
  const items  = budget.budgetItems ?? [];
  const totalR = (budget.incomes ?? []).reduce((s, r) => s + r.amountEUR, 0);
  el.innerHTML = items.map(b => {
    const pct = totalR > 0 ? Math.round((b.allocatedEUR / totalR) * 100) : 0;
    return `<div class="bud-row" data-bud-id="${b.id}">
      <div class="b-ico-wrap" title="Catégorie">${catIco(b.name, 13)}</div>
      <div class="bn">
        <span class="row-view-txt">${esc(b.name)}</span>
        <input type="text" value="${esc(b.name)}" placeholder="Nom du poste">
      </div>
      <div class="ba">
        <span class="row-view-txt amt" style="color:var(--red-l)">${fmt(b.allocatedEUR)}</span>
        <input type="text" inputmode="decimal" value="${fmtInput(b.allocatedEUR)}">
      </div>
      <div class="bp3">${pct}%</div>
      ${_rowActions('Bud', b.id)}
    </div>`;
  }).join('');
}

export function renderBudgetFooter(state) {
  const budget       = state?.budget ?? { incomes: [], budgetItems: [] };
  const transactions = state?.transactions ?? [];
  const incomes      = budget.incomes ?? [];
  const items        = budget.budgetItems ?? [];

  const totalR        = incomes.reduce((s, r) => s + r.amountEUR, 0);
  const totalPonctuel = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amountEUR, 0);
  const totalIncome   = totalR + totalPonctuel;
  const totalB        = items.reduce((s, b) => s + b.allocatedEUR, 0);
  const restB         = totalIncome - totalB;

  _setText('rev-tot', fmt(totalR));

  const ponctuelRow = document.getElementById('bud-ponctuel-row');
  if (ponctuelRow) {
    ponctuelRow.style.display = totalPonctuel > 0 ? '' : 'none';
    _setText('bud-ponctuel-tot', fmt(totalIncome));
    _setText('bud-ponctuel-sub', `dont ${fmt(totalPonctuel)} ponctuels ce mois`);
  }

  _setText('bud-tot', fmt(totalB));
  _setText('bud-tot-pct', (totalIncome > 0 ? Math.round((totalB / totalIncome) * 100) : 0) + '%');

  const br = document.getElementById('bud-reste');
  if (br) {
    br.textContent = (restB >= 0 ? '+' : '') + fmt(Math.abs(restB));
    br.style.color = restB >= 0 ? 'var(--green)' : 'var(--red-l)';
  }

  // Per-row percentages — update in-place to avoid resetting focused inputs
  document.querySelectorAll('.bp3').forEach((el, i) => {
    if (items[i]) el.textContent = totalIncome > 0 ? Math.round((items[i].allocatedEUR / totalIncome) * 100) + '%' : '–';
  });
}

// ── Revenue mutations ─────────────────────────────────────────────

export function editRev(id) {
  const row = document.querySelector(`.rev-row[data-rev-id="${id}"]`);
  if (!row) return;
  row.classList.add('editing');
  const inp = row.querySelector('.rn input');
  if (inp) { inp.focus(); inp.select(); }
}

export function saveRev(id) {
  const row = document.querySelector(`.rev-row[data-rev-id="${id}"]`);
  if (!row) return;
  const b = _budget();
  const r = b.incomes.find(x => x.id === id);
  if (r) {
    r.name      = row.querySelector('.rn input').value.trim() || 'Revenu';
    r.amountEUR = fromDisplay(parseAmt(row.querySelector('.ra input').value));
  }
  _mutate(b);   // commit + re-render → la ligne repasse en mode lecture
}

export function cancelRev() {
  // Aucun commit pendant l'édition → on re-rend l'état stocké (annule les saisies)
  renderRevRows({ budget: store.get('mfx_budget') });
}

export function addRev() {
  const n = document.getElementById('nr-n').value.trim() || 'Revenu';
  const a = fromDisplay(parseAmt(document.getElementById('nr-a').value));
  const b = _budget();
  b.incomes.push({ id: uid(), name: n, amountEUR: a });
  document.getElementById('nr-n').value = '';
  document.getElementById('nr-a').value = '';
  _mutate(b);
  showSuccessToast('Revenu ajouté');
}

export function delRev(id) {
  const b        = _budget();
  const r        = b.incomes.find(x => x.id === id);
  if (!r) return;
  const snapshot = JSON.parse(JSON.stringify(b));
  b.incomes = b.incomes.filter(x => x.id !== id);
  _mutate(b);
  showUndoToast(`"${r.name}" supprimé`, () => _mutate(snapshot));
}

// ── Budget item mutations ─────────────────────────────────────────

export function editBud(id) {
  const row = document.querySelector(`.bud-row[data-bud-id="${id}"]`);
  if (!row) return;
  row.classList.add('editing');
  const inp = row.querySelector('.bn input');
  if (inp) { inp.focus(); inp.select(); }
}

export function saveBud(id) {
  const row = document.querySelector(`.bud-row[data-bud-id="${id}"]`);
  if (!row) return;
  const b = _budget();
  const item = b.budgetItems.find(x => x.id === id);
  if (item) {
    item.name         = row.querySelector('.bn input').value.trim() || 'Nouveau poste';
    item.allocatedEUR = fromDisplay(parseAmt(row.querySelector('.ba input').value));
  }
  _mutate(b);   // commit + re-render (met aussi à jour l'icône de catégorie)
}

export function cancelBud() {
  renderBudRows({ budget: store.get('mfx_budget') });
}

export function addBud() {
  const n = document.getElementById('nb-n').value.trim() || 'Nouveau poste';
  const a = fromDisplay(parseAmt(document.getElementById('nb-a').value));
  const b = _budget();
  b.budgetItems.push({ id: uid(), name: n, allocatedEUR: a });
  document.getElementById('nb-n').value = '';
  document.getElementById('nb-a').value = '';
  _mutate(b);
  showSuccessToast('Poste budgétaire ajouté');
}

export function delBud(id) {
  const b        = _budget();
  const item     = b.budgetItems.find(x => x.id === id);
  if (!item) return;
  const snapshot = JSON.parse(JSON.stringify(b));
  b.budgetItems  = b.budgetItems.filter(x => x.id !== id);
  _mutate(b);
  showUndoToast(`"${item.name}" supprimé`, () => _mutate(snapshot));
}
