// ═══ Aide à la saisie des dépenses — 100% local, hors ligne ═══
// Exploite l'historique (localStorage monargent_YYYY_MM) pour :
//  - proposer les libellés déjà utilisés (auto-complétion),
//  - deviner la catégorie (historique de l'utilisateur, puis dictionnaire),
//  - lister les dépenses les plus fréquentes (raccourcis).
// Aucune donnée n'est ajoutée sans validation : ces fonctions ne font que suggérer.

import { CATS_E } from '../utils.js';

// Dictionnaire mots-clés → catégorie (démarrage à froid, quand il n'y a pas encore d'historique)
const KEYWORD_CATS = [
  [['lidl', 'carrefour', 'auchan', 'leclerc', 'intermarché', 'monoprix', 'franprix', 'casino', 'courses', 'boulangerie', 'supermarché', 'épicerie', 'aldi', 'picard', 'biocoop', 'marché'], 'Alimentation'],
  [['uber', 'bolt', 'taxi', 'essence', 'total', 'shell', 'carburant', 'sncf', 'ratp', 'tram', 'métro', 'metro', 'train', 'péage', 'parking', 'blablacar', 'trottinette', 'transport'], 'Transport'],
  [['loyer', 'edf', 'engie', 'électricité', 'gaz', 'charges', 'syndic', 'assurance habitation'], 'Logement'],
  [['pharmacie', 'docteur', 'médecin', 'dentiste', 'hopital', 'hôpital', 'mutuelle', 'opticien', 'laboratoire', 'kiné'], 'Santé'],
  [['orange', 'sfr', 'bouygues', 'free mobile', 'forfait', 'recharge', 'sim'], 'Téléphone'],
  [['netflix', 'spotify', 'disney', 'canal', 'deezer', 'abonnement', 'prime video', 'youtube', 'icloud', 'apple.com'], 'Abonnements'],
  [['cinéma', 'cinema', 'resto', 'restaurant', 'bar ', 'café', 'mcdo', 'kfc', 'burger', 'concert', 'sortie', 'jeu', 'loisir'], 'Loisirs'],
  [['crédit', 'credit', 'prêt', 'remboursement', 'dette'], 'Dette'],
  [['école', 'ecole', 'scolarité', 'scolarite', 'université', 'universite', 'fournitures', 'livres'], 'Scolarité'],
];

const MONTH_RE = /^monargent_(\d{4})_(\d{2})$/;

function norm(s) { return (s || '').trim().toLowerCase(); }

// Toutes les dépenses passées (tous mois confondus), triées des plus récentes aux plus anciennes
function allExpenses() {
  const out = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!MONTH_RE.test(key)) continue;
    try {
      const p = JSON.parse(localStorage.getItem(key));
      (p.expenses || []).forEach(e => {
        if (e.type === 'income') return;
        const desc = (e.desc ?? e.description ?? '').trim();
        if (!desc) return;
        out.push({ desc, cat: e.cat ?? e.category ?? 'Autre', amount: e.amount ?? 0, date: e.date || '' });
      });
    } catch (err) {}
  }
  out.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
  return out;
}

// Agrégat par libellé (mis en cache ; reconstruit à chaque ouverture de l'écran d'ajout)
let _cache = null;

export function buildCorpus() {
  const byDesc = new Map();
  for (const e of allExpenses()) {
    const k = norm(e.desc);
    if (!byDesc.has(k)) byDesc.set(k, { desc: e.desc, count: 0, cats: {}, lastAmount: e.amount, lastDate: e.date });
    const g = byDesc.get(k);
    g.count++;
    g.cats[e.cat] = (g.cats[e.cat] || 0) + 1;
    if (e.date >= g.lastDate) { g.lastDate = e.date; g.lastAmount = e.amount; g.desc = e.desc; }
  }
  for (const g of byDesc.values()) {
    g.topCat = Object.entries(g.cats).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Autre';
  }
  _cache = byDesc;
  return byDesc;
}

function corpus() { return _cache || buildCorpus(); }

// Dépenses les plus fréquentes (vues au moins 2 fois) — pour les raccourcis
export function frequentExpenses(limit = 6) {
  const arr = [...corpus().values()].filter(g => g.count >= 2);
  arr.sort((a, b) => b.count - a.count || (b.lastDate > a.lastDate ? 1 : -1));
  return arr.slice(0, limit).map(g => ({ desc: g.desc, cat: g.topCat, amount: g.lastAmount }));
}

// Libellés passés correspondant à la saisie — pour l'auto-complétion
export function matchDescriptions(query, limit = 5) {
  const q = norm(query);
  if (q.length < 1) return [];
  const arr = [...corpus().values()].filter(g => {
    const d = norm(g.desc);
    return d.includes(q) && d !== q;
  });
  arr.sort((a, b) => {
    const sa = norm(a.desc).startsWith(q) ? 0 : 1;
    const sb = norm(b.desc).startsWith(q) ? 0 : 1;
    return sa - sb || b.count - a.count || (b.lastDate > a.lastDate ? 1 : -1);
  });
  return arr.slice(0, limit).map(g => ({ desc: g.desc, cat: g.topCat, amount: g.lastAmount }));
}

// Catégorie devinée : historique de l'utilisateur d'abord, puis dictionnaire de mots-clés
export function guessCategory(desc) {
  const d = norm(desc);
  if (!d) return null;
  // 1) libellé identique déjà classé
  const exact = corpus().get(d);
  if (exact) return exact.topCat;
  // 2) libellé passé proche (contient / est contenu), en évitant le bruit sur les saisies très courtes
  if (d.length >= 4) {
    for (const g of corpus().values()) {
      const gd = norm(g.desc);
      if (gd.length >= 4 && (gd.includes(d) || d.includes(gd))) return g.topCat;
    }
  }
  // 3) dictionnaire de mots-clés
  for (const [words, cat] of KEYWORD_CATS) {
    if (words.some(w => d.includes(w))) return CATS_E.includes(cat) ? cat : 'Autre';
  }
  return null;
}
