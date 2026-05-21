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
