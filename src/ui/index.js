import { store } from '../store.js';
import { renderDonut, renderBudgetProgressBars } from './charts.js';
import { fmt } from '../currency.js';
import { calcTotalIncomes, calcTotalAllocated, calcUnallocated } from '../budget.js';
import { calcTotalExpenses, calcTotalPunctualIncomes, getRecent } from '../transactions.js';
import { calcProgress } from '../goals.js';

function setText(id, v) {
  const el = document.getElementById(id);
  if (el) el.textContent = v;
}

export function renderAll(state) {
  const { budget, transactions, goals, month, year } = state;
  if (!budget) return;

  const totalIncomesEUR   = calcTotalIncomes(budget);
  const totalAllocatedEUR = calcTotalAllocated(budget);
  const unallocatedEUR    = calcUnallocated(budget);
  const totalExpensesEUR  = calcTotalExpenses(transactions);
  const punctualIncomesEUR = calcTotalPunctualIncomes(transactions);
  const totalRevenueEUR   = totalIncomesEUR + punctualIncomesEUR;
  const availableEUR      = totalRevenueEUR - totalExpensesEUR;

  // KPI cards
  setText('kpi-revenue',    fmt(totalRevenueEUR));
  setText('kpi-expenses',   fmt(totalExpensesEUR));
  setText('kpi-available',  fmt(availableEUR));
  setText('kpi-unallocated', fmt(unallocatedEUR));

  // Donut chart
  renderDonut(totalExpensesEUR, totalRevenueEUR, totalAllocatedEUR);

  // Budget progress bars
  renderBudgetProgressBars(budget.budgetItems || [], totalIncomesEUR);

  // Recent transactions (5, sorted by date desc)
  renderRecentTransactions(getRecent(transactions));

  // Goals progress
  renderGoalsSummary(goals || []);
}

function renderRecentTransactions(txs) {
  const el = document.getElementById('ov-recent-txs');
  if (!el) return;
  if (!txs.length) {
    el.innerHTML = '<div class="empty">Aucune transaction ce mois-ci</div>';
    return;
  }
  el.innerHTML = txs.map(t => {
    const isE = t.type === 'expense';
    return `<div class="tx-row">
      <span class="tx-desc">${t.description || t.desc || ''}</span>
      <span class="tx-amt" style="color:${isE ? 'var(--red-l)' : 'var(--green)'}">
        ${isE ? '-' : '+'}${fmt(t.amountEUR || t.amount || 0)}
      </span>
    </div>`;
  }).join('');
}

function renderGoalsSummary(goals) {
  const el = document.getElementById('ov-goals');
  if (!el) return;
  if (!goals.length) {
    el.innerHTML = '<div class="empty" style="padding:12px">Aucun objectif défini.</div>';
    return;
  }
  el.innerHTML = goals.map(g => {
    const pct = calcProgress(g);
    return `<div class="gc-mini">
      <div class="gn">${g.name}</div>
      <div class="pt" style="height:6px;margin-top:6px;">
        <div class="pf" style="width:${pct}%;background:${g.color || 'var(--pr)'}"></div>
      </div>
      <div style="font-size:.7rem;color:var(--muted);margin-top:3px;">${pct}%</div>
    </div>`;
  }).join('');
}

// Subscribe to store changes
export function subscribeAll(callback) {
  ['mfx_budget', 'mfx_transactions', 'mfx_goals'].forEach(key => {
    store.subscribe(key, () => {
      callback({
        budget: store.get('mfx_budget'),
        transactions: store.get('mfx_transactions') || [],
        goals: store.get('mfx_goals') || [],
      });
    });
  });
}
