// ═══ Toast de palier : une dépense fait franchir 50 / 80 / 100 % d'un poste ═══
import { store } from '../store.js';
import { categoryAlerts, newCrossing } from '../budget.js';
import { showSuccessToast } from './toast.js';

// Mémoire des paliers déjà annoncés, par mois : { [idPoste]: palier }
function _key(Y, M) {
  return `mfx_cat_alerts_${Y}_${String(M + 1).padStart(2, '0')}`;
}

function _readAnnounced(Y, M) {
  try {
    const v = store.load(_key(Y, M), {});  // lit localStorage (la mémoire survit au rechargement)
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch (e) {
    return {};
  }
}

function _messageFor({ name, level }) {
  if (level >= 100) return `${name} : budget dépassé`;
  return `${name} : ${level} % du budget atteint`;
}

// Renvoie true si un toast de palier a été affiché.
// M est zéro-based (comme _getYM). Le nom du poste est du texte brut : showSuccessToast l'échappe.
export function announceCrossing(budget, beforeTxs, afterTxs, Y, M) {
  const items = budget?.budgetItems ?? [];
  const before = categoryAlerts(items, beforeTxs || []);
  const after  = categoryAlerts(items, afterTxs || []);
  const announced = _readAnnounced(Y, M);
  const crossing = newCrossing(before, after, announced);
  if (!crossing) return false;
  store.set(_key(Y, M), { ...announced, [crossing.id]: crossing.level });
  showSuccessToast(_messageFor(crossing));
  return true;
}
