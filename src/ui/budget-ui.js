// ═══ Budget UI — revenue sources + budget items (onglet Budget) ═══
import { store }      from '../store.js';
import { bridgeSave } from '../data-bridge.js';
import { uid, esc, parseAmt, catIco, COLS } from '../utils.js';
import { fmt, fmtInput, fromDisplay }       from '../currency.js';
import { showSuccessToast, showUndoToast }  from './toast.js';

// Injected by initBudgetUI — returns [Y, M] of the active month
let _getYM = () => { const n = new Date(); return [n.getFullYear(), n.getMonth()]; };

// Pending in-memory budget (between oninput and debounced commit)
let _pending = null;
let _saveTimer = null;

// ── Init (call from src/main.js) ───────────────────────────────────

export function initBudgetUI(getYM) {
  _getYM = getYM;
  window.addRev          = addRev;
  window.delRev          = delRev;
  window.addBud          = addBud;
  window.delBud          = delBud;
  window.updateBudIcon   = updateBudIcon;
  window.updateRevName   = updateRevName;
  window.updateRevAmount = updateRevAmount;
  window.updateBudName   = updateBudName;
  window.updateBudAmount = updateBudAmount;
}

// ── Helpers ───────────────────────────────────────────────────────

function _budget() {
  // Pending takes priority so subsequent oninput calls see the latest state
  return _pending ?? store.get('mfx_budget') ?? { incomes: [], budgetItems: [] };
}

// Full immediate commit → triggers subscribeAll → full re-render (add/delete only)
function _mutate(b) {
  _pending = null;
  clearTimeout(_saveTimer);
  store.set('mfx_budget', b);
  const [Y, M] = _getYM();
  bridgeSave(Y, M);
}

// Silent in-memory update → debounced commit after user stops typing (oninput)
function _mutateSilent(b, updateFooter = false) {
  _pending = b;
  if (updateFooter) {
    renderBudgetFooter({ budget: b, transactions: store.get('mfx_transactions') || [] });
  }
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    if (_pending) {
      store.set('mfx_budget', _pending);
      const [Y, M] = _getYM();
      bridgeSave(Y, M);
      _pending = null;
    }
  }, 500);
}

function _setText(id, v) {
  const el = document.getElementById(id);
  if (el) el.textContent = v;
}

// ── Render ────────────────────────────────────────────────────────

export function renderRevRows(state) {
  const el = document.getElementById('rev-rows');
  if (!el) return;
  const incomes = state?.budget?.incomes ?? [];
  el.innerHTML = incomes.map((r, i) =>
    `<div class="rev-row">
      <div class="rn"><input type="text" value="${esc(r.name)}" placeholder="Source"
        oninput="updateRevName('${r.id}',this.value)"></div>
      <div class="ra"><input type="text" inputmode="decimal" value="${fmtInput(r.amountEUR)}"
        style="color:${COLS[i % COLS.length]}"
        oninput="updateRevAmount('${r.id}',this.value)"></div>
      <div class="row-del"><button onclick="delRev('${r.id}')" title="Supprimer">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button></div>
    </div>`
  ).join('');
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
      <div class="bn"><input type="text" value="${esc(b.name)}" placeholder="Nom du poste"
        oninput="updateBudName('${b.id}',this.value)"></div>
      <div class="ba"><input type="text" inputmode="decimal" value="${fmtInput(b.allocatedEUR)}"
        oninput="updateBudAmount('${b.id}',this.value)"></div>
      <div class="bp3">${pct}%</div>
      <div class="row-del"><button onclick="delBud('${b.id}')" title="Supprimer">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button></div>
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

export function updateRevName(id, name) {
  const b = _budget();
  const r = b.incomes.find(x => x.id === id);
  if (r) { r.name = name; _mutateSilent(b); }
}

export function updateRevAmount(id, displayVal) {
  const b = _budget();
  const r = b.incomes.find(x => x.id === id);
  if (r) { r.amountEUR = fromDisplay(parseAmt(displayVal)); _mutateSilent(b, true); }
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

export function updateBudName(id, name) {
  const b = _budget();
  const item = b.budgetItems.find(x => x.id === id);
  if (item) { item.name = name; updateBudIcon(id, name); _mutateSilent(b); }
}

export function updateBudAmount(id, displayVal) {
  const b = _budget();
  const item = b.budgetItems.find(x => x.id === id);
  if (item) { item.allocatedEUR = fromDisplay(parseAmt(displayVal)); _mutateSilent(b, true); }
}

export function updateBudIcon(id, name) {
  const row = document.querySelector(`.bud-row[data-bud-id="${id}"]`);
  if (row) row.querySelector('.b-ico-wrap').innerHTML = catIco(name, 13);
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
