import { store } from './store.js';

const AI_HISTORY_KEY = 'mfx_ai_history';

let _greetDebounceTimer = null;

export function buildSystemContext({ month, budget, transactions, goals }) {
  const totalIncomesEUR = (budget.incomes || []).reduce((s, r) => s + r.amountEUR, 0);
  const totalExpensesEUR = transactions
    .filter(t => t.type === 'expense')
    .reduce((s, t) => s + t.amountEUR, 0);
  const unallocatedEUR = totalIncomesEUR - (budget.budgetItems || []).reduce((s, b) => s + b.allocatedEUR, 0);

  const budgetItems = (budget.budgetItems || []).map(b => {
    const spentEUR = transactions
      .filter(t => t.type === 'expense' && t.category === b.name)
      .reduce((s, t) => s + t.amountEUR, 0);
    return { name: b.name, allocatedEUR: b.allocatedEUR, spentEUR };
  });

  const goalsCtx = (goals || []).map(g => {
    const dl = g.deadline
      ? Math.ceil((new Date(g.deadline) - new Date()) / (1000 * 60 * 60 * 24))
      : null;
    return { name: g.name, targetEUR: g.targetEUR, savedEUR: g.savedEUR, deadlineDays: dl };
  });

  return { month, totalIncomesEUR, totalExpensesEUR, unallocatedEUR, budgetItems, goals: goalsCtx };
}

export function loadHistory() {
  return store.load(AI_HISTORY_KEY, []);
}

export function saveHistory(messages) {
  store.set(AI_HISTORY_KEY, messages);
}

export function clearHistory() {
  store.remove(AI_HISTORY_KEY);
}

export async function sendMessage(userText, context) {
  const history = loadHistory();
  const userMsg = { role: 'user', content: userText };
  const messages = [...history.map(m => ({ role: m.role, content: m.content })), userMsg];

  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, context }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Erreur ${res.status}`);
  }

  const data = await res.json();
  const reply = data.reply;

  const updatedHistory = [
    ...history,
    { role: 'user', content: userText },
    { role: 'assistant', content: reply },
  ];
  saveHistory(updatedHistory);

  return { reply, usage: data.usage };
}

export function maybeRefreshGreeting(financialData, onGreeting) {
  if (sessionStorage.getItem('greetingDone')) return;

  const hash = [
    financialData.totalIncomesEUR,
    financialData.totalExpensesEUR,
    (financialData.goals || []).map(g => `${g.savedEUR}/${g.targetEUR}`).join(','),
  ].join('_');

  clearTimeout(_greetDebounceTimer);
  _greetDebounceTimer = setTimeout(async () => {
    if (sessionStorage.getItem('greetingDone')) return;

    const question = `Génère une observation financière courte (max 18 mots) pour cet utilisateur. Un seul emoji au début, puis le message directement. Pas de salutation.`;
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: question }],
          context: financialData,
        }),
      });
      if (!res.ok) return;
      const data = await res.json();
      const msg = (data.reply || '').trim().replace(/^["'«»]|["'«»]$/g, '').trim();
      if (msg) {
        sessionStorage.setItem('greetingDone', '1');
        onGreeting(msg);
      }
    } catch (_) {}
  }, 3000);
}
