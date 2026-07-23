// ═══ Dashboard UI — rendu de l'accueil épuré (style Sleek) ═══
import { fmt } from '../currency.js';
import { calcTotalIncomes, calcTotalAllocated } from '../budget.js';
import { calcTotalExpenses, calcTotalPunctualIncomes, getRecent } from '../transactions.js';
import { catIco, esc, fmtDate } from '../utils.js';
import { getPreviousMonthAvailableEUR, bridgeLoadPrefs } from '../data-bridge.js';

// initDashboard (ResizeObserver du donut) reste défini dans index.js
export { initDashboard } from './index.js';

function setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }

const MONTHS_SHORT = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'aoû', 'sep', 'oct', 'nov', 'déc'];

export function renderDashboard(state) {
  const { budget, transactions, goals, month, year } = state;
  if (!budget) return;

  const revenue    = calcTotalIncomes(budget) + calcTotalPunctualIncomes(transactions);
  const expenses   = calcTotalExpenses(transactions);
  const available  = revenue - expenses;
  const allocated  = calcTotalAllocated(budget);
  const budgetRest = allocated - expenses;

  // En-tête : prénom si dispo, sinon "Compte principal"
  const prefs = bridgeLoadPrefs();
  setText('dash-hello', prefs.username ? prefs.username : 'Compte principal');
  const av = document.getElementById('dash-avatar');
  if (av) av.textContent = (prefs.username || 'M').trim().charAt(0).toUpperCase();

  // Mois courant
  let Y = year ?? new Date().getFullYear(), M = new Date().getMonth();
  if (month) { const p = month.split('-'); Y = parseInt(p[0], 10); M = parseInt(p[1], 10) - 1; }
  setText('dash-month', `${MONTHS_SHORT[M]} ${Y}`);

  // Héros : reste disponible
  const heroEl = document.getElementById('dash-hero-val');
  if (heroEl) {
    heroEl.textContent = (available < 0 ? '−' : '') + fmt(Math.abs(available));
    heroEl.classList.toggle('is-neg', available < 0);
  }

  // Delta vs mois précédent
  const prevAvail = getPreviousMonthAvailableEUR(Y, M);
  const deltaEl = document.getElementById('dash-hero-delta');
  if (deltaEl) {
    if (prevAvail === null) {
      deltaEl.textContent = '';
      deltaEl.className = 'dash-hero-delta';
    } else {
      const d = available - prevAvail;
      const up = d >= 0;
      deltaEl.className = 'dash-hero-delta ' + (up ? 'is-up' : 'is-down');
      deltaEl.textContent = `${up ? '↗' : '↘'} ${up ? '+' : '−'}${fmt(Math.abs(d))} ce mois-ci`;
    }
  }

  // Carte budget restant
  setText('dash-budget-rest', (budgetRest < 0 ? '−' : '') + fmt(Math.abs(budgetRest)));
  const pct = allocated > 0 ? Math.min(100, Math.round((expenses / allocated) * 100)) : 0;
  const gauge = document.getElementById('dash-budget-gauge');
  if (gauge) {
    gauge.style.width = pct + '%';
    gauge.style.background = pct > 90 ? 'var(--red)' : pct > 70 ? 'var(--gold)' : 'var(--pr)';
  }
  setText('dash-budget-sub', `${pct}% utilisé sur ${fmt(allocated)}`);

  // Carte objectif prioritaire
  renderGoalCard(goals || []);

  // Récents
  renderRecent(getRecent(transactions, 4));
}

function renderGoalCard(goals) {
  const el = document.getElementById('dash-goal-card');
  if (!el) return;
  if (!goals.length) {
    el.innerHTML = `<div class="dash-card-hd">Objectif</div><div class="dash-goal-empty">Créer un objectif</div>`;
    return;
  }
  const g = goals[0];
  const pct = g.targetEUR > 0 ? Math.min(100, Math.round((g.savedEUR / g.targetEUR) * 100)) : 0;
  el.innerHTML = `
    <div class="dash-card-hd">${esc(g.name)}</div>
    <div class="dash-card-val">${fmt(g.savedEUR ?? 0)}</div>
    <div class="pt dash-card-gauge"><div class="pf" style="width:${pct}%;background:${g.color || 'var(--pr)'}"></div></div>
    <div class="dash-card-sub">${pct}% · objectif ${fmt(g.targetEUR ?? 0)}</div>`;
}

function renderRecent(txs) {
  const el = document.getElementById('dash-recent');
  if (!el) return;
  if (!txs.length) {
    el.innerHTML = `<div class="dash-recent-empty">Aucune transaction ce mois-ci</div>`;
    return;
  }
  el.innerHTML = txs.map(t => {
    const isE = t.type === 'expense';
    const col = isE ? 'var(--red-l)' : 'var(--green)';
    const ibg = isE ? 'rgba(196,58,58,.12)' : 'rgba(52,211,153,.12)';
    return `<div class="dash-recent-row">
      <div class="dash-recent-ico" style="background:${ibg};color:${col}">${catIco(t.category, 15)}</div>
      <div class="dash-recent-info">
        <div class="dash-recent-desc">${esc(t.description || t.category || '')}</div>
        <div class="dash-recent-cat">${esc(t.category || '')} · ${fmtDate(t.date)}</div>
      </div>
      <div class="dash-recent-amt" style="color:${col}">${isE ? '−' : '+'} ${fmt(t.amountEUR ?? 0)}</div>
    </div>`;
  }).join('');
}
