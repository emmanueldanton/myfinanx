// ═══ Push Notify — programme une notif personnalisée à 20h via OneSignal REST ═══
import { store }                                        from '../store.js';
import { fmt }                                          from '../currency.js';
import { calcTotalIncomes, calcTotalAllocated }         from '../budget.js';
import { calcTotalExpenses, calcTotalPunctualIncomes }  from '../transactions.js';

const SCHEDULED_KEY = 'mfx-push-scheduled-date';
const USER_KEY      = 'monargent-username';

// ── Entry point — appeler une fois au lancement ───────────────────

export async function scheduleDailyPush() {
  // Uniquement si la permission push est accordée
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

  // Une seule fois par jour
  const today = new Date().toDateString();
  if (localStorage.getItem(SCHEDULED_KEY) === today) return;

  // Récupère l'ID de subscription OneSignal
  const subscriptionId = await _getSubscriptionId();
  if (!subscriptionId) return;

  // Analyse les données et construit le message
  const { title, message } = _buildNotification();

  // Heure de livraison : aujourd'hui à 20h00 (heure locale)
  const deliverAt = _deliveryTime();

  try {
    const res = await fetch('/api/push-notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscriptionId, title, message, deliverAt }),
    });
    if (res.ok) {
      try { localStorage.setItem(SCHEDULED_KEY, today); } catch (e) {}
    }
  } catch (e) {
    // Non bloquant — échec silencieux
  }
}

// ── OneSignal subscription ID ─────────────────────────────────────

function _getSubscriptionId() {
  return new Promise(resolve => {
    window.loadOneSignal?.();   // charge le SDK à la demande (permission déjà accordée ici)
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(function(OneSignal) {
      resolve(OneSignal.User.PushSubscription.id ?? null);
    });
    // Timeout 3s si OneSignal ne répond pas
    setTimeout(() => resolve(null), 3000);
  });
}

// ── Construction du message selon la situation financière ─────────

function _buildNotification() {
  const prenom = localStorage.getItem(USER_KEY) || '';
  const s      = prenom ? `${prenom}, ` : '';  // "Marie, " ou ""

  const budget       = store.get('mfx_budget') ?? { incomes: [], budgetItems: [] };
  const transactions = store.get('mfx_transactions') || [];
  const goals        = store.get('mfx_goals') || [];

  const totalRevenu  = calcTotalIncomes(budget) + calcTotalPunctualIncomes(transactions);
  const totalDepense = calcTotalExpenses(transactions);
  const pct          = totalRevenu > 0 ? Math.round((totalDepense / totalRevenu) * 100) : -1;
  const txCount      = transactions.filter(t => t.type === 'expense').length;
  const reste        = Math.max(0, totalRevenu - totalDepense);

  // ① Budget critique > 90 %
  if (pct > 90) return {
    title:   'MyFinanx ⚠️',
    message: `${s}tu as dépensé ${pct}% de tes revenus ce mois. Il te reste ${fmt(reste)} — surveille tes sorties.`,
  };

  // ② Budget serré 75–90 %
  if (pct > 75) return {
    title:   'MyFinanx',
    message: `${s}tu es à ${pct}% de ton budget ce mois. Garde un œil sur tes dépenses pour finir dans le vert.`,
  };

  // ③ Objectif proche d'être atteint (≥ 80 %)
  const goalNear = goals.find(g =>
    g.targetEUR > 0 &&
    g.savedEUR / g.targetEUR >= 0.8 &&
    g.savedEUR < g.targetEUR
  );
  if (goalNear) {
    const gPct = Math.round((goalNear.savedEUR / goalNear.targetEUR) * 100);
    return {
      title:   'MyFinanx 🎯',
      message: `${s}ton objectif "${goalNear.name}" est à ${gPct}% ! Encore un effort pour l'atteindre.`,
    };
  }

  // ④ Peu de transactions enregistrées (< 3)
  if (txCount < 3) return {
    title:   'MyFinanx',
    message: `${s}seulement ${txCount} dépense${txCount > 1 ? 's' : ''} notée${txCount > 1 ? 's' : ''} ce mois. Toutes tes transactions sont-elles enregistrées ?`,
  };

  // ⑤ Situation positive (< 50 % du budget utilisé)
  if (pct >= 0 && pct < 50) return {
    title:   'MyFinanx ✅',
    message: `${s}tu es en bonne forme ce mois — ${fmt(reste)} encore disponibles. Continue comme ça !`,
  };

  // ⑥ Défaut — rappel quotidien générique
  return {
    title:   'MyFinanx',
    message: `${s}n'oublie pas de noter tes dépenses du jour pour rester sur la bonne voie.`,
  };
}

// ── Calcul de l'heure de livraison ───────────────────────────────

function _deliveryTime() {
  const target = new Date();
  target.setHours(20, 0, 0, 0);
  // Si 20h est déjà passé, on envoie demain à 20h
  if (new Date() >= target) target.setDate(target.getDate() + 1);
  return target.toISOString();
}
