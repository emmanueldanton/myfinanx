// ═══ Dépenses récurrentes : calendrier, règles, génération ═══
// Une règle : { id, description, category, amountEUR, freq, startDate, lastDate, active }
// freq : 'week' | 'month' | 'quarter' ; dates au format AAAA-MM-JJ (date locale).

import { store } from './store.js';
import { bridgeSave, appendToMonth } from './data-bridge.js';
import { uid } from './utils.js';

const RULES_KEY = 'mfx_recurring';

function _parse(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m: m - 1, d };
}

function _iso(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function _daysInMonth(y, m) {
  return new Date(y, m + 1, 0).getDate();
}

// n-ième occurrence (n = 0 pour la date de début)
function _nth(rule, n) {
  const s = _parse(rule.startDate);
  if (rule.freq === 'week') {
    const dt = new Date(s.y, s.m, s.d + 7 * n);
    return _iso(dt.getFullYear(), dt.getMonth(), dt.getDate());
  }
  const step = rule.freq === 'quarter' ? 3 : 1;
  const total = s.m + step * n;
  const y = s.y + Math.floor(total / 12);
  const m = ((total % 12) + 12) % 12;
  // Jour d'ancrage ramené au dernier jour des mois plus courts, sans dériver ensuite
  return _iso(y, m, Math.min(s.d, _daysInMonth(y, m)));
}

// Dates des occurrences strictement après afterISO et au plus todayISO, triées.
export function occurrencesBetween(rule, afterISO, todayISO) {
  const out = [];
  for (let n = 0; ; n++) {
    const date = _nth(rule, n);
    if (date > todayISO) break;
    if (date > afterISO) out.push(date);
  }
  return out;
}

export function loadRules() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RULES_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

export function saveRules(rules) {
  try {
    localStorage.setItem(RULES_KEY, JSON.stringify(rules));
  } catch (e) {}
}

// Crée les dépenses dues jusqu'à todayISO pour chaque règle active, chacune dans son mois.
// shownYM = [année, mois 0-11] du mois affiché (écrit dans le store), les autres mois
// sont écrits directement dans leur stockage. Renvoie le nombre d'opérations créées.
export function generateDue(todayISO, shownYM) {
  const rules = loadRules();
  const byMonth = new Map();   // 'Y-M' -> transactions
  let created = 0;

  for (const rule of rules) {
    if (!rule.active) continue;
    const dates = occurrencesBetween(rule, rule.lastDate || rule.startDate, todayISO);
    for (const date of dates) {
      const { y, m } = _parse(date);
      const key = `${y}-${m}`;
      if (!byMonth.has(key)) byMonth.set(key, []);
      byMonth.get(key).push({
        id: uid(), date, type: 'expense', recurId: rule.id,
        description: rule.description, category: rule.category, amountEUR: rule.amountEUR,
      });
      created++;
    }
    if (dates.length) rule.lastDate = dates[dates.length - 1];
  }
  if (!created) return 0;

  const [sY, sM] = shownYM;
  for (const [key, txs] of byMonth) {
    const [y, m] = key.split('-').map(Number);
    if (y === sY && m === sM) {
      store.set('mfx_transactions', [...txs.reverse(), ...(store.get('mfx_transactions') || [])]);
      bridgeSave(y, m);
    } else {
      appendToMonth(y, m, txs.reverse());
    }
  }
  saveRules(rules);
  return created;
}
