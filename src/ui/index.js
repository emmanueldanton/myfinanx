import { initDonutResizeObserver } from './charts.js';
import { renderDashboard } from './dashboard.js';

export function renderAll(state) {
  const { budget, transactions, month, year } = state;
  if (!budget) return;

  // Rendu de l'accueil épuré (héros, cartes, récents)
  renderDashboard(state);

  // Libellé du mois pour l'en-tête desktop (#ml)
  let M = new Date().getMonth(), Y = year ?? new Date().getFullYear();
  if (month) { const p = month.split('-'); Y = parseInt(p[0], 10); M = parseInt(p[1], 10) - 1; }
  const MONTHS_SHORT = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'aoû', 'sep', 'oct', 'nov', 'déc'];
  const mlEl = document.getElementById('ml');
  if (mlEl) mlEl.textContent = MONTHS_SHORT[M] + ' ' + Y;   // libellé court épuré (comme Budget)
  const mlBud = document.getElementById('ml-bud');
  if (mlBud) mlBud.textContent = MONTHS_SHORT[M] + ' ' + Y;
}

// Initialize donut resize observer (call once at startup; no-op si l'accueil n'a plus de donut)
export function initDashboard() {
  initDonutResizeObserver();
}
