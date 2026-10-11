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

// ═══ Plan d'épargne : versement mensuel ou en une fois ═══
// goal.plan        : 'monthly' | 'once' | undefined (pas de plan)
// goal.monthlyEUR  : montant prévu chaque mois (plan mensuel)
// goal.deposits    : [{ d: 'YYYY-MM-DD', a: montantEUR }] versements enregistrés

export function ymKey(Y, M) {
  return `${Y}-${String(M + 1).padStart(2, '0')}`;
}

// Total versé sur l'objectif pendant le mois donné
export function paidInMonth(goal, Y, M) {
  const k = ymKey(Y, M);
  return (goal.deposits || [])
    .filter(x => typeof x.d === 'string' && x.d.slice(0, 7) === k)
    .reduce((s, x) => s + (x.a || 0), 0);
}

// Montant attendu pour le mois (le « mini-objectif » du mois), 0 si rien n'est dû.
export function dueInMonth(goal, Y, M) {
  if (!goal) return 0;
  const paid = paidInMonth(goal, Y, M);
  const remainingAtStart = Math.max(0, goal.targetEUR - goal.savedEUR + paid);
  if (goal.plan === 'monthly' && goal.monthlyEUR > 0) {
    return Math.min(goal.monthlyEUR, remainingAtStart);
  }
  if (goal.plan === 'once' && goal.deadline && goal.deadline.slice(0, 7) === ymKey(Y, M)) {
    return remainingAtStart;
  }
  return 0;
}

// Ce qu'il reste à verser ce mois-ci pour tenir le plan
export function leftToPayInMonth(goal, Y, M) {
  return Math.max(0, dueInMonth(goal, Y, M) - paidInMonth(goal, Y, M));
}

// Calendrier d'un plan mensuel à partir du mois (Y, M), en tenant compte de ce qui est
// déjà versé ce mois-ci : { extra: mois suivants nécessaires, thisMonth: reste du mois à verser }
function _schedule(goal, Y, M) {
  const rest = Math.max(0, goal.targetEUR - goal.savedEUR);
  const leftThis = Math.min(rest, Math.max(0, goal.monthlyEUR - paidInMonth(goal, Y, M)));
  const extra = Math.ceil(Math.max(0, rest - leftThis) / goal.monthlyEUR - 1e-9);
  return { extra, thisMonth: leftThis };
}

// Nombre de mois de versements restants (le mois en cours compte s'il reste à y verser)
export function monthsToReach(goal, Y, M) {
  if (!(goal.monthlyEUR > 0)) return null;
  if (Y == null) { const n = new Date(); Y = n.getFullYear(); M = n.getMonth(); }
  const { extra, thisMonth } = _schedule(goal, Y, M);
  return extra + (thisMonth > 0 ? 1 : 0);
}

// Mois (Y, M) du dernier versement prévu
export function finishMonth(goal, fromY, fromM) {
  if (!(goal.monthlyEUR > 0)) return null;
  const { extra } = _schedule(goal, fromY, fromM);
  const t = fromY * 12 + fromM + extra;
  return { Y: Math.floor(t / 12), M: t % 12 };
}

// Mensualité nécessaire pour tenir une échéance (mois en cours compris)
export function requiredMonthly(goal, fromY, fromM) {
  if (!goal.deadline) return null;
  const [y, m] = goal.deadline.split('-').map(Number);
  const months = (y * 12 + (m - 1)) - (fromY * 12 + fromM) + 1;
  if (months <= 0) return null;
  const rest = Math.max(0, goal.targetEUR - goal.savedEUR);
  return rest / months;
}
