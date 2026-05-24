// ═══ Transactions UI — dépenses + revenus ponctuels (onglet Dépenses) ═══
import { store }      from '../store.js';
import { bridgeSave } from '../data-bridge.js';
import { uid, esc, parseAmt, fmtDate, catIco, CAT_COLORS, CATS_E, CATS_I, todayISO } from '../utils.js';
import { fmt, fmtInput, fromDisplay, getActiveCurrency } from '../currency.js';

let _txType = 'expense';
let _getYM  = () => { const n = new Date(); return [n.getFullYear(), n.getMonth()]; };

// ── Init ──────────────────────────────────────────────────────────

export function initTransactionsUI(getYM) {
  _getYM = getYM;
  window.addTx        = addTx;
  window.delTx        = delTx;
  window.openEditTx   = openEditTx;
  window.closeEditTx  = closeEditTx;
  window.saveEditTx   = saveEditTx;
  window.setTxType    = setTxType;
  window.updateCatSel = updateCatSel;

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

export function renderExpenses(state) {
  const list = document.getElementById('txl');
  if (!list) return;
  const txs = state?.transactions ?? [];
  if (!txs.length) {
    list.innerHTML = `<div class="empty"><div class="empty-ico"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>Aucune transaction.<br>Ajoute ta première ci-dessus.</div>`;
    renderCatBk([]);
    return;
  }
  list.innerHTML = txs.map(t => {
    const isE  = t.type !== 'income';
    const col  = isE ? 'var(--red-l)' : 'var(--green)';
    const ibg  = isE ? 'rgba(196,58,58,.14)' : 'rgba(52,211,153,.12)';
    const sign = isE ? '−' : '+';
    const ico  = catIco(t.category, 14);
    const cats = (isE ? CATS_E : CATS_I).map(c =>
      `<option value="${c}"${c === t.category ? ' selected' : ''}>${c}</option>`
    ).join('');
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
      <button class="txed" onclick="openEditTx('${t.id}')" title="Modifier">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </button>
      <button class="txdl" onclick="delTx('${t.id}')" title="Supprimer">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
      </button>
      <div class="tx-edit-form" id="txef-${t.id}" style="display:none;">
        <div class="tx-edit-field">
          <div class="tx-edit-lbl">Description</div>
          <input type="text" class="tx-edit-desc" value="${esc(t.description || '')}" placeholder="Description">
        </div>
        <div class="tx-edit-field">
          <div class="tx-edit-lbl">Catégorie</div>
          <select class="tx-edit-cat">${cats}</select>
        </div>
        <div class="tx-edit-field">
          <div class="tx-edit-lbl">Montant</div>
          <input type="text" inputmode="decimal" class="tx-edit-amt" value="${fmtInput(t.amountEUR ?? 0)}" placeholder="Montant">
        </div>
        <div class="tx-edit-field">
          <div class="tx-edit-lbl">Date</div>
          <input type="date" class="tx-edit-date" value="${t.date || ''}">
        </div>
        <div class="tx-edit-actions">
          <button class="btn bp bsm" onclick="saveEditTx('${t.id}')">Enregistrer</button>
          <button class="btn bsm" onclick="closeEditTx('${t.id}')">Annuler</button>
        </div>
      </div>
    </div>`;
  }).join('');
  renderCatBk(txs.filter(t => t.type !== 'income'));
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
}

export function delTx(id) {
  const txs = _txs();
  const tx  = txs.find(t => t.id === id);
  if (!tx) return;
  if (!confirm(`Supprimer "${tx.description}" (${fmt(tx.amountEUR ?? 0)}) ?`)) return;
  _mutate(txs.filter(t => t.id !== id));
}

export function openEditTx(id) {
  document.querySelectorAll('.tx-edit-form').forEach(f => { f.style.display = 'none'; });
  const form = document.getElementById('txef-' + id);
  if (form) form.style.display = 'block';
}

export function closeEditTx(id) {
  const form = document.getElementById('txef-' + id);
  if (form) form.style.display = 'none';
}

export function saveEditTx(id) {
  const txs = _txs();
  const tx  = txs.find(t => t.id === id);
  if (!tx) return;
  const form = document.getElementById('txef-' + id);
  if (!form) return;
  const desc = form.querySelector('.tx-edit-desc').value.trim();
  const cat  = form.querySelector('.tx-edit-cat').value;
  const amt  = fromDisplay(parseAmt(form.querySelector('.tx-edit-amt').value));
  const date = form.querySelector('.tx-edit-date').value;
  if (!desc || amt <= 0) return;
  tx.description = desc;
  tx.category    = cat;
  tx.amountEUR   = amt;
  if (date) tx.date = date;
  _mutate(txs);
}
