// ═══ Transactions UI — dépenses + revenus ponctuels (onglet Dépenses) ═══
import { store }      from '../store.js';
import { bridgeSave } from '../data-bridge.js';
import { uid, esc, parseAmt, fmtDate, catIco, CAT_COLORS, CATS_E, CATS_I, todayISO } from '../utils.js';
import { fmt, fmtInput, fromDisplay, getActiveCurrency } from '../currency.js';
import { showSuccessToast, showUndoToast } from './toast.js';

let _txType      = 'expense';
let _getYM       = () => { const n = new Date(); return [n.getFullYear(), n.getMonth()]; };
let _searchQuery = '';
let _filterCat   = '';
let _lastState   = null;

// ── Init ──────────────────────────────────────────────────────────

export function initTransactionsUI(getYM) {
  _getYM = getYM;
  window.addTx        = addTx;
  window.delTx        = delTx;
  window.setTxType    = setTxType;
  window.updateCatSel = updateCatSel;
  window.searchTx     = searchTx;
  window.filterTxCat  = filterTxCat;
  // Écran dédié Dépense / Revenu (ajout + édition)
  window.openTxScreen     = openTxScreen;
  window.openTxScreenEdit = openTxScreenEdit;
  window.setTxScreenType  = setTxScreenType;
  window.saveTxScreen     = saveTxScreen;

  const txDt = document.getElementById('tx-dt');
  if (txDt && !txDt.value) txDt.value = todayISO();
  updateCatSel();
}

// ── Helpers ───────────────────────────────────────────────────────

function _txs() {
  return store.get('mfx_transactions') || [];
}

function _mutate(txs) {
  store.set('mfx_transactions', txs);
  const [Y, M] = _getYM();
  bridgeSave(Y, M);
}

function _setText(id, v) {
  const el = document.getElementById(id);
  if (el) el.textContent = v;
}

// ── Render ────────────────────────────────────────────────────────

export function searchTx(q) {
  _searchQuery = q.trim().toLowerCase();
  const inp = document.getElementById('tx-search');
  const clr = document.getElementById('tx-search-clear');
  if (inp) inp.value = q;
  if (clr) clr.style.display = _searchQuery ? '' : 'none';
  if (_lastState) renderExpenses(_lastState);
}

export function filterTxCat(cat) {
  _filterCat = _filterCat === cat ? '' : cat; // toggle
  if (_lastState) renderExpenses(_lastState);
}

function _applyFilters(txs) {
  return txs.filter(t => {
    const matchCat = !_filterCat || t.category === _filterCat;
    const matchQ   = !_searchQuery
      || (t.description || '').toLowerCase().includes(_searchQuery)
      || (t.category    || '').toLowerCase().includes(_searchQuery);
    return matchCat && matchQ;
  });
}

function _renderCatPills(txs) {
  const wrap = document.getElementById('tx-cat-pills');
  if (!wrap) return;
  const cats = [...new Set(txs.map(t => t.category).filter(Boolean))].sort();
  if (!cats.length) { wrap.innerHTML = ''; return; }
  wrap.innerHTML = [
    `<button class="tx-cat-pill${!_filterCat ? ' active' : ''}" onclick="filterTxCat('')">Tous</button>`,
    ...cats.map(c =>
      `<button class="tx-cat-pill${_filterCat === c ? ' active' : ''}" onclick="filterTxCat('${esc(c)}')">${esc(c)}</button>`
    ),
  ].join('');
}

export function resetTxFilters() {
  _searchQuery = '';
  _filterCat   = '';
  const inp = document.getElementById('tx-search');
  const clr = document.getElementById('tx-search-clear');
  if (inp) inp.value = '';
  if (clr) clr.style.display = 'none';
}

export function renderExpenses(state) {
  _lastState = state;
  const list = document.getElementById('txl');
  if (!list) return;
  const allTxs     = state?.transactions ?? [];
  const filtered   = _applyFilters(allTxs);
  _renderCatPills(allTxs);

  if (!allTxs.length) {
    list.innerHTML = `<div class="empty"><div class="empty-ico"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>Aucune transaction.<br>Ajoute ta première ci-dessus.</div>`;
    renderCatBk([]);
    return;
  }
  if (!filtered.length) {
    list.innerHTML = `<div class="empty"><div class="empty-ico"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div>Aucun résultat pour ce filtre.</div>`;
    return;
  }
  list.innerHTML = filtered.map(t => {
    const isE  = t.type !== 'income';
    const col  = isE ? 'var(--red-l)' : 'var(--green)';
    const ibg  = isE ? 'rgba(196,58,58,.14)' : 'rgba(52,211,153,.12)';
    const sign = isE ? '−' : '+';
    const ico  = catIco(t.category, 14);
    return `<div class="txi" id="txi-${t.id}">
      <div class="txii" style="background:${ibg};color:${col}">${ico}</div>
      <div class="txif">
        <div class="txid">${esc(t.description || '')}</div>
        <div class="txim">
          <span class="cpill">${t.category || ''}</span>
          <span class="txdt">${fmtDate(t.date)}</span>
        </div>
      </div>
      <div class="txam" style="color:${col}">${sign} ${fmt(t.amountEUR ?? 0)}</div>
      <button class="txed" onclick="openTxScreenEdit('${t.id}')" title="Modifier">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </button>
      <button class="txdl" onclick="delTx('${t.id}')" title="Supprimer">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
      </button>
    </div>`;
  }).join('');
  renderCatBk(allTxs.filter(t => t.type !== 'income'));
}

export function renderCatBk(expenses) {
  const div = document.getElementById('cat-bk');
  if (!div) return;
  if (!expenses.length) {
    div.innerHTML = `<div class="empty" style="padding:10px"><div class="empty-ico"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg></div>Aucune dépense ce mois-ci</div>`;
    return;
  }
  const bycat = {};
  expenses.forEach(t => { bycat[t.category] = (bycat[t.category] || 0) + (t.amountEUR ?? 0); });
  const tot = Object.values(bycat).reduce((s, v) => s + v, 0);
  div.innerHTML = Object.entries(bycat).sort((a, b) => b[1] - a[1]).map(([c, a]) => {
    const pct = tot > 0 ? Math.round((a / tot) * 100) : 0;
    const cc  = CAT_COLORS[c] || 'var(--pr)';
    return `<div class="catrow">
      <div class="catrow-l">${c}</div>
      <div class="catrow-b"><div class="pt"><div class="pf" style="width:${pct}%;background:${cc}"></div></div></div>
      <div class="catrow-a" style="color:var(--red-l)">−${fmt(a)}</div>
    </div>`;
  }).join('');
}

export function updateTracker(state) {
  const budget       = state?.budget ?? { incomes: [], budgetItems: [] };
  const transactions = state?.transactions ?? [];
  const totalR        = (budget.incomes ?? []).reduce((s, r) => s + r.amountEUR, 0);
  const totalPonctuel = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amountEUR, 0);
  const totalIncome   = totalR + totalPonctuel;
  const totalE        = transactions.filter(t => t.type !== 'income').reduce((s, t) => s + t.amountEUR, 0);
  const reste         = totalIncome - totalE;
  _setText('tr-b', fmt(totalIncome));
  _setText('tr-t', fmt(totalE));
  const el = document.getElementById('tr-r');
  if (el) { el.textContent = fmt(Math.abs(reste)); el.style.color = reste >= 0 ? 'var(--pr-l)' : 'var(--red-l)'; }
}

// ── Form helpers ──────────────────────────────────────────────────

export function setTxType(t) {
  _txType = t;
  document.getElementById('ty-e')?.classList.toggle('on', t === 'expense');
  document.getElementById('ty-i')?.classList.toggle('on', t === 'income');
  updateCatSel();
}

export function updateCatSel() {
  const sel = document.getElementById('tx-c');
  if (!sel) return;
  const cats = _txType === 'expense' ? CATS_E : CATS_I;
  sel.innerHTML = cats.map(c => `<option value="${c}">${c}</option>`).join('');
}

// ── Mutations ─────────────────────────────────────────────────────

export function addTx() {
  const desc    = document.getElementById('tx-d').value.trim();
  const cat     = document.getElementById('tx-c').value;
  const dispAmt = parseAmt(document.getElementById('tx-a').value);
  const date    = document.getElementById('tx-dt').value || todayISO();
  if (!desc || !dispAmt || dispAmt <= 0) {
    const a = document.getElementById('tx-a');
    a.style.borderColor = 'var(--red)'; a.style.boxShadow = '0 0 0 3px rgba(196,58,58,.2)';
    setTimeout(() => { a.style.borderColor = ''; a.style.boxShadow = ''; }, 1400);
    return;
  }
  const txs = _txs();
  txs.unshift({
    id:          uid(),
    description: desc,
    category:    cat,
    amountEUR:   fromDisplay(dispAmt),
    date,
    type:        _txType,
    curCode:     getActiveCurrency().code,
  });
  document.getElementById('tx-d').value = '';
  document.getElementById('tx-a').value = '';
  _mutate(txs);
  showSuccessToast('Transaction ajoutée');
}

export function delTx(id) {
  const txs      = _txs();
  const tx       = txs.find(t => t.id === id);
  if (!tx) return;
  const snapshot = [...txs];
  _mutate(txs.filter(t => t.id !== id));
  showUndoToast(`"${tx.description}" supprimée`, () => _mutate(snapshot));
}

// ── Écran dédié Dépense / Revenu (ajout + édition) ────────────────
let _txScrType = 'expense';
let _txEditId  = null;

export function openTxScreen(type) {
  _txEditId  = null;
  _txScrType = type === 'income' ? 'income' : 'expense';
  setTxScreenType(_txScrType);
  _setVal('txs-desc', '');
  _setVal('txs-amt', '');
  _setVal('txs-date', todayISO());
  _setText('txs-title', _txScrType === 'income' ? 'Nouveau revenu' : 'Nouvelle dépense');
  _setText('txs-save-lbl', 'Ajouter');
  const sym = document.getElementById('txs-cur-sym');
  if (sym) sym.textContent = getActiveCurrency().symbol;
  window.openScreen?.('screen-tx');
  setTimeout(() => document.getElementById('txs-desc')?.focus(), 60);
}

export function openTxScreenEdit(id) {
  const tx = _txs().find(t => t.id === id);
  if (!tx) return;
  _txEditId  = id;
  _txScrType = tx.type === 'income' ? 'income' : 'expense';
  setTxScreenType(_txScrType, tx.category);
  _setVal('txs-desc', tx.description || '');
  _setVal('txs-amt', tx.amountEUR != null ? fmtInput(tx.amountEUR) : '');
  _setVal('txs-date', tx.date || todayISO());
  _setText('txs-title', 'Modifier la transaction');
  _setText('txs-save-lbl', 'Enregistrer');
  const sym = document.getElementById('txs-cur-sym');
  if (sym) sym.textContent = getActiveCurrency().symbol;
  window.openScreen?.('screen-tx');
}

const _TX_ICO = {
  expense: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>',
  income:  '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
};

export function setTxScreenType(t, keepCat) {
  _txScrType = t === 'income' ? 'income' : 'expense';
  document.getElementById('txs-ty-e')?.classList.toggle('on', _txScrType === 'expense');
  document.getElementById('txs-ty-i')?.classList.toggle('on', _txScrType === 'income');
  // Hero : couleur, icône et libellé selon le type
  const hero = document.getElementById('txs-hero');
  if (hero) {
    hero.classList.toggle('is-expense', _txScrType === 'expense');
    hero.classList.toggle('is-income',  _txScrType === 'income');
  }
  const heroIco = document.getElementById('txs-hero-ico');
  if (heroIco) heroIco.innerHTML = _TX_ICO[_txScrType];
  _setText('txs-hero-lbl', _txScrType === 'income' ? 'Montant du revenu' : 'Montant de la dépense');
  const sel = document.getElementById('txs-cat');
  if (sel) {
    const cats = _txScrType === 'expense' ? CATS_E : CATS_I;
    const prev = keepCat || sel.value;
    sel.innerHTML = cats.map(c => `<option value="${c}"${c === prev ? ' selected' : ''}>${c}</option>`).join('');
  }
}

export function saveTxScreen() {
  const desc = (document.getElementById('txs-desc')?.value || '').trim();
  const cat  = document.getElementById('txs-cat')?.value || '';
  const amt  = fromDisplay(parseAmt(document.getElementById('txs-amt')?.value || ''));
  const date = document.getElementById('txs-date')?.value || todayISO();
  if (!desc || !amt || amt <= 0) {
    const a = document.getElementById('txs-amt');
    if (a) { a.classList.add('invalid'); setTimeout(() => a.classList.remove('invalid'), 1400); }
    return;
  }
  const txs = _txs();
  if (_txEditId) {
    const tx = txs.find(t => t.id === _txEditId);
    if (tx) { tx.description = desc; tx.category = cat; tx.amountEUR = amt; tx.date = date; tx.type = _txScrType; }
  } else {
    txs.unshift({
      id: uid(), description: desc, category: cat, amountEUR: amt,
      date, type: _txScrType, curCode: getActiveCurrency().code,
    });
  }
  _mutate(txs);
  window.closeScreen?.();
  showSuccessToast(_txEditId ? 'Transaction modifiée' : 'Transaction ajoutée');
  _txEditId = null;
}

function _setVal(id, v) { const el = document.getElementById(id); if (el) el.value = v; }
