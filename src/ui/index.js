import { initDonutResizeObserver } from './charts.js';
import { fmt } from '../currency.js';
import { calcTotalIncomes, calcUnallocated } from '../budget.js';
import { calcTotalExpenses, calcTotalPunctualIncomes } from '../transactions.js';
import { MONTHS } from '../utils.js';
import { renderDashboard } from './dashboard.js';

export function renderAll(state) {
  const { budget, transactions, month, year } = state;
  if (!budget) return;

  // Rendu de l'accueil épuré (héros, cartes, récents)
  renderDashboard(state);

  // Libellé du mois pour l'en-tête desktop (#ml)
  let M = new Date().getMonth(), Y = year ?? new Date().getFullYear();
  if (month) { const p = month.split('-'); Y = parseInt(p[0], 10); M = parseInt(p[1], 10) - 1; }
  const mlEl = document.getElementById('ml');
  if (mlEl) mlEl.textContent = MONTHS[M] + ' ' + Y;
  const MONTHS_SHORT = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'aoû', 'sep', 'oct', 'nov', 'déc'];
  const mlBud = document.getElementById('ml-bud');
  if (mlBud) mlBud.textContent = MONTHS_SHORT[M] + ' ' + Y;

  // Alerte budget (page Budget, #bud-al) — dépassement d'allocation / non-alloué / >90% dépensé
  const unallocatedEUR   = calcUnallocated(budget);
  const totalRevenueEUR  = calcTotalIncomes(budget) + calcTotalPunctualIncomes(transactions);
  const totalExpensesEUR = calcTotalExpenses(transactions);
  const pct = totalRevenueEUR > 0 ? Math.round((totalExpensesEUR / totalRevenueEUR) * 100) : 0;

  const warnIco = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
  const infoIco = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
  let al = '';
  if (unallocatedEUR < 0)        al += `<div class="alert ab">${warnIco} Tu as alloué <strong>${fmt(Math.abs(unallocatedEUR))}</strong> de plus que tes revenus.</div>`;
  else if (unallocatedEUR > 100) al += `<div class="alert ag">${infoIco} <strong>${fmt(unallocatedEUR)}</strong> non alloués — affecte-les à tes priorités.</div>`;
  if (pct > 90 && totalRevenueEUR > 0) al += `<div class="alert ab">${warnIco} Plus de 90% de tes revenus dépensés ce mois !</div>`;
  const budAl = document.getElementById('bud-al');
  if (budAl) budAl.innerHTML = al;
}

// Initialize donut resize observer (call once at startup; no-op si l'accueil n'a plus de donut)
export function initDashboard() {
  initDonutResizeObserver();
}
