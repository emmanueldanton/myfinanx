// ═══ Reminders UI — rappels in-app intelligents (1 fois/jour max) ═══
import { store } from '../store.js';

const REMINDER_KEY = 'monargent-reminder-seen';
const MONTHS       = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

// ── Init ──────────────────────────────────────────────────────────

export function initRemindersUI() {
  window.closeReminder = closeReminder;
}

// ── Check & show ──────────────────────────────────────────────────

export function checkReminder() {
  const now      = Date.now();
  const lastSeen = parseInt(localStorage.getItem(REMINDER_KEY) || '0', 10);
  if (now - lastSeen < 24 * 60 * 60 * 1000) return;

  const [Y, M]   = _currentYM();
  const budget   = store.get('mfx_budget') ?? { incomes: [], budgetItems: [] };
  const txs      = store.get('mfx_transactions') || [];
  const goals    = store.get('mfx_goals') || [];

  const incomes  = budget.incomes ?? [];
  const items    = budget.budgetItems ?? [];
  const depenses = txs.filter(t => t.type !== 'income');

  const totalR = incomes.reduce((s, r) => s + r.amountEUR, 0);
  const totalE = depenses.reduce((s, t) => s + t.amountEUR, 0);

  const today = new Date();
  const dom   = today.getDate();
  const dow   = today.getDay();

  const msgs = [];

  // Bilan hebdomadaire (lundi)
  if (dow === 1 && totalR > 0) {
    const pct = Math.round((totalE / totalR) * 100);
    msgs.push({ type: 'info', txt: `Bilan de la semaine : ${pct}% de tes revenus utilisés ce mois-ci.` });
  }
  // Début de mois sans budget planifié
  if (dom <= 5 && items.length && items.every(b => b.allocatedEUR === 0)) {
    msgs.push({ type: 'warn', txt: `Début de ${MONTHS[M]}. Prends 5 min pour planifier ton budget.` });
  }
  // Fin de mois — dépenses > 80% des revenus
  if (dom >= 25 && totalR > 0 && totalE / totalR > 0.8) {
    msgs.push({ type: 'warn', txt: `Fin de mois : ${Math.round((totalE / totalR) * 100)}% de tes revenus dépensés. Reste vigilant.` });
  }
  // Objectif atteint
  const doneGoal = goals.find(g => g.targetEUR > 0 && g.savedEUR >= g.targetEUR);
  if (doneGoal) {
    msgs.push({ type: 'good', txt: `Objectif "${doneGoal.name}" atteint. Félicitations !` });
  }
  // Objectif proche (>= 80%)
  const nearGoal = goals.find(g => g.targetEUR > 0 && g.savedEUR < g.targetEUR && g.savedEUR / g.targetEUR >= 0.8);
  if (nearGoal) {
    const pct = Math.round((nearGoal.savedEUR / nearGoal.targetEUR) * 100);
    msgs.push({ type: 'good', txt: `Objectif "${nearGoal.name}" à ${pct}%. Tu y es presque !` });
  }
  // Pas de saisie depuis 3 jours
  if (depenses.length) {
    const lastDate  = depenses.map(t => new Date(t.date)).sort((a, b) => b - a)[0];
    const daysSince = Math.floor((now - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince >= 3) {
      msgs.push({ type: 'warn', txt: `Aucune saisie depuis ${daysSince} jours. Des dépenses sont peut-être manquantes.` });
    }
  }
  // Pas de revenus après le 3
  if (totalR === 0 && dom > 3) {
    msgs.push({ type: 'warn', txt: `Pas de revenus saisis pour ${MONTHS[M]}. Commence par là pour activer ton budget.` });
  }

  if (!msgs.length) return;
  showReminder(msgs[0].type, msgs[0].txt);
  localStorage.setItem(REMINDER_KEY, now.toString());
}

export function showReminder(type, txt) {
  const bar  = document.getElementById('reminder-bar');
  const span = document.getElementById('reminder-txt');
  const ico  = document.getElementById('reminder-ico');
  if (!bar || !span || !ico) return;
  const icoMap = {
    warn: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
    good: '<polyline points="20 6 9 17 4 12"/>',
    info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
  };
  const colMap = { warn: 'var(--gold)', good: 'var(--green)', info: 'var(--pr-l)' };
  bar.className      = 'reminder-bar show rb-' + type;
  span.textContent   = txt;
  ico.innerHTML      = icoMap[type] || icoMap.info;
  ico.setAttribute('stroke', colMap[type] || colMap.info);
}

export function closeReminder() {
  document.getElementById('reminder-bar')?.classList.remove('show');
}

// ── Internal ──────────────────────────────────────────────────────

function _currentYM() {
  const n = new Date();
  return [n.getFullYear(), n.getMonth()];
}
