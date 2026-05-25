import { store } from '../store.js';
import { renderDonut, renderBudgetProgressBars, initDonutResizeObserver } from './charts.js';
import { fmt } from '../currency.js';
import { calcTotalIncomes, calcTotalAllocated, calcUnallocated } from '../budget.js';
import { calcTotalExpenses, calcTotalPunctualIncomes, getRecent } from '../transactions.js';
import { MONTHS, catIco, esc, fmtDate, CAT_COLORS, COLS } from '../utils.js';

function setText(id, v) {
  const el = document.getElementById(id);
  if (el) el.textContent = v;
}

export function renderAll(state) {
  const { budget, transactions, goals, month, year } = state;
  if (!budget) return;

  const totalIncomesEUR    = calcTotalIncomes(budget);
  const totalAllocatedEUR  = calcTotalAllocated(budget);
  const unallocatedEUR     = calcUnallocated(budget);
  const totalExpensesEUR   = calcTotalExpenses(transactions);
  const punctualIncomesEUR = calcTotalPunctualIncomes(transactions);
  const totalRevenueEUR    = totalIncomesEUR + punctualIncomesEUR;
  const availableEUR       = totalRevenueEUR - totalExpensesEUR;

  // Parse "YYYY-MM" into year + 0-indexed month
  let Y = year ?? new Date().getFullYear(), M = new Date().getMonth();
  if (month) {
    const parts = month.split('-');
    Y = parseInt(parts[0], 10);
    M = parseInt(parts[1], 10) - 1;
  }

  // Month label
  const mlEl = document.getElementById('ml');
  if (mlEl) mlEl.textContent = MONTHS[M] + ' ' + Y;

  // Hero KPI cards
  setText('ov-rev', fmt(totalRevenueEUR));
  setText('ov-rev2', fmt(totalRevenueEUR));
  setText('ov-dep', fmt(totalExpensesEUR));

  const restEl = document.getElementById('ov-rest');
  if (restEl) {
    restEl.textContent = (availableEUR < 0 ? '−' : '') + fmt(Math.abs(availableEUR));
    restEl.style.color = availableEUR < 0 ? 'var(--red-l)' : '';
  }
  const naEl = document.getElementById('ov-na');
  if (naEl) naEl.textContent = (unallocatedEUR >= 0 ? '+' : '') + fmt(Math.abs(unallocatedEUR));

  // KPI sub-labels
  const incomeCount = budget.incomes?.length ?? 0;
  const txCount = transactions.filter(t => t.type === 'expense').length;
  setText('ov-rev-sub', `${incomeCount} source${incomeCount > 1 ? 's' : ''}`);
  setText('ov-dep-sub', `${txCount} transaction${txCount > 1 ? 's' : ''}`);

  const restSub = document.getElementById('ov-rest-sub');
  if (restSub) restSub.textContent = availableEUR >= 0 ? 'En sécurité' : 'Dépassement !';
  const naSub = document.getElementById('ov-na-sub');
  if (naSub) naSub.textContent = unallocatedEUR >= 0 ? 'à réallouer' : 'Déficit budget';

  // Donut chart
  renderDonut(totalExpensesEUR, totalRevenueEUR, totalAllocatedEUR);

  // Budget progress bars
  renderBudgetProgressBars(budget.budgetItems || [], totalIncomesEUR);

  // Recent transactions
  renderRecentTransactions(getRecent(transactions), transactions.length);

  // Overview progress bar
  const pct = totalRevenueEUR > 0 ? Math.min(100, Math.round((totalExpensesEUR / totalRevenueEUR) * 100)) : 0;
  const pb = document.getElementById('ov-pct-b');
  if (pb) { pb.style.width = pct + '%'; pb.style.background = pct > 80 ? 'var(--red)' : pct > 60 ? 'var(--gold)' : 'var(--pr)'; }
  const pl = document.getElementById('ov-pct-l');
  if (pl) { pl.textContent = pct + '%'; pl.style.color = pct > 80 ? 'var(--red-l)' : pct > 60 ? 'var(--gold)' : 'var(--pr-l)'; }
  setText('ov-all', fmt(totalAllocatedEUR));

  // Revenue source mini-cards (ov-cards)
  const cardsEl = document.getElementById('ov-cards');
  if (cardsEl) {
    cardsEl.innerHTML = (budget.incomes || []).map((r, i) => `<div class="kpi">
      <div class="kpi-bar" style="background:${COLS[i % COLS.length]}"></div>
      <div class="kpi-hd">
        <div class="kpi-hd-ico" style="background:${COLS[i % COLS.length]}22">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${COLS[i % COLS.length]}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
        </div>
        <div class="kpi-lbl">${esc(r.name)}</div>
      </div>
      <div class="kpi-val" style="color:${COLS[i % COLS.length]}">${fmt(r.amountEUR ?? 0)}</div>
    </div>`).join('');
  }

  // Budget / expense alerts (bud-al + ov-al)
  const warnIco = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
  const infoIco = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
  let al = '';
  if (unallocatedEUR < 0)        al += `<div class="alert ab">${warnIco} Tu as alloué <strong>${fmt(Math.abs(unallocatedEUR))}</strong> de plus que tes revenus.</div>`;
  else if (unallocatedEUR > 100) al += `<div class="alert ag">${infoIco} <strong>${fmt(unallocatedEUR)}</strong> non alloués — affecte-les à tes priorités.</div>`;
  if (pct > 90 && totalRevenueEUR > 0) al += `<div class="alert ab">${warnIco} Plus de 90% de tes revenus dépensés ce mois !</div>`;
  ['bud-al', 'ov-al'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = al;
  });
}

function renderRecentTransactions(txs, totalCount) {
  const el = document.getElementById('ov-recent-txs');
  if (!el) return;
  if (!txs.length) {
    el.innerHTML = `<div class="empty" style="padding:18px;"><div class="empty-ico"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>Aucune transaction ce mois-ci</div>`;
    return;
  }
  const EXPENSE_COUNT = txs.filter(t => t.type === 'expense').length;
  el.innerHTML = txs.map(t => {
    const isE = t.type === 'expense';
    const col = isE ? 'var(--red-l)' : 'var(--green)';
    const ibg = isE ? 'rgba(196,58,58,.14)' : 'rgba(52,211,153,.12)';
    const sign = isE ? '−' : '+';
    const ico = catIco(t.category, 13);
    return `<div class="ov-recent-row">
      <div class="ov-recent-ico" style="background:${ibg};color:${col}">${ico}</div>
      <div class="ov-recent-info">
        <div class="ov-recent-desc">${esc(t.description || '')}</div>
        <div class="ov-recent-cat">${t.category || ''}</div>
      </div>
      <span class="ov-recent-date">${fmtDate(t.date)}</span>
      <div class="ov-recent-amt" style="color:${col}">${sign} ${fmt(t.amountEUR ?? 0)}</div>
    </div>`;
  }).join('');
  if (totalCount > 5) {
    el.innerHTML += `<button class="ov-see-all" onclick="goTab('tracker')">
      Voir toutes les transactions
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
    </button>`;
  }
}

// Subscribe to store changes
export function subscribeAll(callback) {
  ['mfx_budget', 'mfx_transactions', 'mfx_goals'].forEach(key => {
    store.subscribe(key, () => callback());
  });
}

// Initialize donut resize observer (call once at startup)
export function initDashboard() {
  initDonutResizeObserver();
}
