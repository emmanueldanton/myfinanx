export function calcTotalExpenses(transactions) {
  return transactions
    .filter(t => t.type === 'expense')
    .reduce((s, t) => s + t.amountEUR, 0);
}

export function calcTotalPunctualIncomes(transactions) {
  return transactions
    .filter(t => t.type === 'income')
    .reduce((s, t) => s + t.amountEUR, 0);
}

export function calcByCategory(transactions) {
  const map = {};
  transactions
    .filter(t => t.type === 'expense')
    .forEach(t => {
      map[t.category] = (map[t.category] || 0) + t.amountEUR;
    });
  return map;
}

export function sortByDateDesc(transactions) {
  return [...transactions].sort((a, b) => b.date.localeCompare(a.date));
}

export function getRecent(transactions, n = 5) {
  return sortByDateDesc(transactions).slice(0, n);
}

export const CATEGORIES_EXPENSE = [
  'Alimentation', 'Transport', 'Logement', 'Téléphone', 'Santé',
  'Loisirs', 'Épargne', 'Business', 'Habillement', 'Éducation',
  'Voyages', 'Restaurants', 'Abonnements', 'Imprévus', 'Autre',
];

export const CATEGORIES_INCOME = [
  'Salaire', 'Freelance', 'Remboursement', 'Cadeau', 'Investissement', 'Autre',
];
