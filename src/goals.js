export function calcProgress(goal) {
  if (!goal.targetEUR || goal.targetEUR <= 0) return 0;
  return Math.min(100, Math.round((goal.savedEUR / goal.targetEUR) * 100));
}

export function calcRemaining(goal) {
  return Math.max(0, goal.targetEUR - goal.savedEUR);
}

export function deadlineDays(goal) {
  if (!goal.deadline) return null;
  const now = new Date();
  const dl = new Date(goal.deadline);
  return Math.ceil((dl - now) / (1000 * 60 * 60 * 24));
}

export function addDeposit(goal, amountEUR) {
  if (amountEUR <= 0) throw new Error('Montant invalide');
  return {
    ...goal,
    savedEUR: Math.min(goal.targetEUR, goal.savedEUR + amountEUR),
  };
}
