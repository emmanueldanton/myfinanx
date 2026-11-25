import { calcByCategory } from './transactions.js';

export function calcTotalIncomes(budget) {
  return (budget.incomes || []).reduce((s, r) => s + r.amountEUR, 0);
}

export function calcTotalAllocated(budget) {
  return (budget.budgetItems || []).reduce((s, b) => s + b.allocatedEUR, 0);
}

export function calcUnallocated(budget) {
  return calcTotalIncomes(budget) - calcTotalAllocated(budget);
}

export function calcItemPercent(item, budget) {
  const total = calcTotalIncomes(budget);
  if (total <= 0) return 0;
  return Math.round((item.allocatedEUR / total) * 100);
}

export function copyFromPreviousMonth(prevBudget) {
  const newIncome = (prevBudget.incomes || []).map(r => ({
    ...r,
    id: 'inc_' + Date.now() + Math.random().toString(36).slice(2, 6),
  }));
  const newItems = (prevBudget.budgetItems || []).map(b => ({
    ...b,
    id: 'bi_' + Date.now() + Math.random().toString(36).slice(2, 6),
  }));
  return { incomes: newIncome, budgetItems: newItems };
}

// Palier atteint selon le ratio brut dépensé / alloué (100 seulement si le budget est atteint)
function levelFor(ratio) {
  if (ratio >= 1) return 100;
  if (ratio >= 0.8) return 80;
  if (ratio >= 0.5) return 50;
  return 0;
}

// Alerte par poste budgété (dépenses seulement, postes sans budget exclus)
export function categoryAlerts(budgetItems, transactions) {
  const spentByCat = calcByCategory(transactions);
  return (budgetItems || [])
    .filter(b => b.allocatedEUR > 0)
    .map(b => {
      const spentEUR = spentByCat[b.name] || 0;
      const ratio = spentEUR / b.allocatedEUR;
      let pct = Math.round(ratio * 100);
      if (ratio < 1 && pct >= 100) pct = 99;  // jamais 100 % affiché sous le budget
      return { id: b.id, name: b.name, spentEUR, allocatedEUR: b.allocatedEUR, pct, level: levelFor(ratio) };
    });
}

// Poste qui vient de franchir un nouveau palier (>= 50) non encore annoncé ce mois
export function newCrossing(before, after, announced) {
  const prev = new Map((before || []).map(a => [a.id, a.level]));
  let best = null;
  for (const a of after || []) {
    if (a.level < 50) continue;
    if (a.level <= (prev.get(a.id) ?? 0)) continue;
    if (a.level <= (announced?.[a.id] ?? 0)) continue;
    if (!best || a.level > best.level || (a.level === best.level && a.pct > best.pct)) best = a;
  }
  return best ? { id: best.id, name: best.name, level: best.level } : null;
}

// Poste le plus avancé parmi ceux à 80 % ou plus, pour la notification du soir
export function pushCategory(alerts) {
  let best = null;
  for (const a of alerts || []) {
    if (a.level < 80) continue;
    if (!best || a.pct > best.pct) best = a;
  }
  return best;
}
