// Normalisation de la réponse IA d'un scan (ticket, facture, relevé).
// L'IA peut renvoyer des montants en texte, des dates au format français, des catégories
// approximatives : tout est ramené ici à un format strict avant d'atteindre l'application.

const MAX_ITEMS = 100;

// Lignes de relevé qui ne sont pas des opérations (soldes, totaux) : jamais proposées.
const NOT_AN_OPERATION = /^((ancien|nouveau) )?solde\b|^total(aux)?\b|^totaux\b|^report\b/i;

const CURRENCY_ALIASES = {
  'FCFA': 'XOF', 'F CFA': 'XOF', 'CFA': 'XOF', 'XOF': 'XOF', 'F': 'XOF',
  '€': 'EUR', 'EUR': 'EUR', 'EURO': 'EUR', 'EUROS': 'EUR',
  '$': 'USD', 'USD': 'USD', 'US$': 'USD',
  '£': 'GBP', 'GBP': 'GBP',
  'CAD': 'CAD', 'CA$': 'CAD',
  'MAD': 'MAD', 'DH': 'MAD', 'DHS': 'MAD',
};

function fold(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

// « 1 250,50 », « 1.250,50 », « 1,250.50 », « 12 500 F » -> nombre
export function parseAmount(v) {
  if (typeof v === 'number') return isFinite(v) ? Math.abs(v) : NaN;
  let s = String(v ?? '').replace(/[^\d.,]/g, '');
  if (!s) return NaN;
  const hasComma = s.includes(','), hasDot = s.includes('.');
  if (hasComma && hasDot) {
    // le dernier séparateur rencontré est le séparateur décimal
    s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (/^\d{1,3}([.,]\d{3})+$/.test(s)) {
    // « 12.500 » ou « 1,250,000 » : séparateurs de milliers (courant en FCFA)
    s = s.replace(/[.,]/g, '');
  } else {
    s = s.replace(',', '.');
  }
  const n = parseFloat(s);
  return isFinite(n) ? n : NaN;
}

function pad(n) { return String(n).padStart(2, '0'); }

function validYMD(y, m, d) {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

// Renvoie YYYY-MM-DD, ou `today` si absente, invalide ou dans le futur.
export function normalizeDate(v, today) {
  const s = String(v ?? '').trim();
  let y, m, d, mt;
  if ((mt = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) { y = +mt[1]; m = +mt[2]; d = +mt[3]; }
  else if ((mt = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/))) {
    d = +mt[1]; m = +mt[2]; y = +mt[3]; if (y < 100) y += 2000;
  } else return today;
  if (!validYMD(y, m, d)) return today;
  const iso = `${y}-${pad(m)}-${pad(d)}`;
  return iso > today ? today : iso;
}

export function normalizeCurrency(v) {
  if (!v) return null;
  const k = String(v).trim().toUpperCase();
  if (CURRENCY_ALIASES[k]) return CURRENCY_ALIASES[k];
  return /^[A-Z]{3}$/.test(k) ? k : null;
}

function matchCategory(v, list) {
  const f = fold(v);
  if (!f) return 'Autre';
  const exact = list.find(c => fold(c) === f);
  if (exact) return exact;
  const partial = list.find(c => f.includes(fold(c)) || fold(c).includes(f));
  return partial || 'Autre';
}

export function normalizeScan(raw, { expenseCategories, incomeCategories, today }) {
  const obj = raw && typeof raw === 'object' ? raw : {};
  const list = Array.isArray(obj.operations) ? obj.operations
    : Array.isArray(obj.items) ? obj.items
    : Array.isArray(obj.depenses) ? obj.depenses : [];
  const merchant = typeof obj.merchant === 'string' && obj.merchant.trim() ? obj.merchant.trim().slice(0, 60) : null;
  const docCurrency = normalizeCurrency(obj.currency);

  const items = [];
  for (const it of list.slice(0, MAX_ITEMS)) {
    if (!it || typeof it !== 'object') continue;
    const amount = parseAmount(it.amount ?? it.montant);
    if (!(amount > 0) || amount > 1e9) continue;
    const t = fold(it.type);
    const type = ['income', 'revenu', 'credit', 'entree'].includes(t) ? 'income' : 'expense';
    const description = String(it.description ?? it.libelle ?? merchant ?? '').replace(/\s+/g, ' ').trim().slice(0, 80)
      || (type === 'income' ? 'Revenu' : 'Dépense');
    if (NOT_AN_OPERATION.test(description)) continue;
    items.push({
      date: normalizeDate(it.date, today),
      description,
      amount: Math.round(amount * 100) / 100,
      type,
      category: matchCategory(it.category ?? it.categorie, type === 'income' ? incomeCategories : expenseCategories),
      currency: normalizeCurrency(it.currency) || docCurrency,
    });
  }

  const docType = ['ticket', 'facture', 'releve', 'autre'].includes(fold(obj.docType)) ? fold(obj.docType) : 'autre';
  const error = !items.length && typeof obj.error === 'string' ? obj.error.slice(0, 200) : null;
  return { docType, merchant, currency: docCurrency, items, error };
}
