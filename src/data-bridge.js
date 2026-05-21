// ═══ Data Bridge — bidirectional conversion between monolith and modular store ═══
//
// Monolith format (localStorage key: monargent_YYYY_MM):
//   { revenus:[{id,name,amount}], budget:[{id,name,amount}], expenses:[{id,date,type,desc,cat,amount}] }
//   Goals (monargent_goals): [{id,name,target,saved,deadline,color}]
//
// Modular format (store keys: mfx_budget, mfx_transactions, mfx_goals):
//   mfx_budget: { incomes:[{id,name,amountEUR}], budgetItems:[{id,name,allocatedEUR}] }
//   mfx_transactions: [{id,date,type,description,category,amountEUR}]
//   mfx_goals: [{id,name,targetEUR,savedEUR,deadline,color}]

import { store } from './store.js';
import { uid } from './utils.js';

const GOALS_KEY = 'monargent_goals';

function monthKey(Y, M) {
  return `monargent_${Y}_${String(M + 1).padStart(2, '0')}`;
}

function defaultMonthData() {
  return { revenus: [], budget: [], expenses: [] };
}

function findPreviousMonthData(Y, M) {
  let pm = M - 1, py = Y;
  if (pm < 0) { pm = 11; py--; }
  const prevKey = `monargent_${py}_${String(pm + 1).padStart(2, '0')}`;
  try {
    const raw = localStorage.getItem(prevKey);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && Array.isArray(p.revenus) && Array.isArray(p.budget)) return p;
    }
  } catch (e) {}
  return null;
}

// Load month data from monolith localStorage → populate mfx_budget + mfx_transactions in store
export function bridgeLoad(Y, M) {
  const raw = localStorage.getItem(monthKey(Y, M));
  let mono;

  if (raw) {
    try {
      const p = JSON.parse(raw);
      const def = defaultMonthData();
      mono = {
        revenus:  Array.isArray(p.revenus)  ? p.revenus  : def.revenus,
        budget:   Array.isArray(p.budget)   ? p.budget   : def.budget,
        expenses: Array.isArray(p.expenses) ? p.expenses : [],
      };
    } catch (e) {
      mono = defaultMonthData();
    }
  } else {
    // New month: inherit revenues and budget from previous month with fresh IDs
    const prev = findPreviousMonthData(Y, M);
    mono = {
      revenus:  prev ? prev.revenus.map(r => ({ ...r, id: uid() })) : [],
      budget:   prev ? prev.budget.map(b  => ({ ...b, id: uid() })) : [],
      expenses: [],
    };
  }

  // If budget is still empty after check, try previous month (covers months with cleared budgets)
  if (!mono.budget.length) {
    const prev = findPreviousMonthData(Y, M);
    if (prev && Array.isArray(prev.budget) && prev.budget.length) {
      mono.budget = prev.budget.map(b => ({ ...b, id: uid() }));
    }
  }

  // Convert to modular format
  store.set('mfx_budget', {
    incomes: mono.revenus.map(r => ({
      id: r.id,
      name: r.name,
      amountEUR: r.amount ?? 0,
    })),
    budgetItems: mono.budget.map(b => ({
      id: b.id,
      name: b.name,
      allocatedEUR: b.amount ?? 0,
    })),
  });

  store.set('mfx_transactions', mono.expenses.map(e => ({
    id:          e.id,
    date:        e.date,
    type:        e.type,
    description: e.desc ?? e.description ?? '',
    category:    e.cat  ?? e.category    ?? 'Autre',
    amountEUR:   e.amount ?? 0,
  })));
}

// Write modular store back to monolith localStorage format
export function bridgeSave(Y, M) {
  const budget = store.get('mfx_budget') || { incomes: [], budgetItems: [] };
  const txs    = store.get('mfx_transactions') || [];

  const mono = {
    revenus:  budget.incomes.map(r => ({ id: r.id, name: r.name, amount: r.amountEUR ?? 0 })),
    budget:   budget.budgetItems.map(b => ({ id: b.id, name: b.name, amount: b.allocatedEUR ?? 0 })),
    expenses: txs.map(t => ({
      id:     t.id,
      date:   t.date,
      type:   t.type,
      desc:   t.description,
      cat:    t.category,
      amount: t.amountEUR ?? 0,
    })),
  };

  try {
    localStorage.setItem(monthKey(Y, M), JSON.stringify(mono));
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      // Caller handles toast
      throw e;
    }
  }
}

// Load goals from monolith localStorage → populate mfx_goals in store
export function bridgeLoadGoals() {
  try {
    const raw = localStorage.getItem(GOALS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        store.set('mfx_goals', parsed.map(g => ({
          id:        g.id,
          name:      g.name,
          targetEUR: g.target ?? g.targetEUR ?? 0,
          savedEUR:  g.saved  ?? g.savedEUR  ?? 0,
          deadline:  g.deadline,
          color:     g.color || '#4D78D4',
        })));
        return;
      }
    }
  } catch (e) {}
  store.set('mfx_goals', []);
}

// Write modular goals back to monolith localStorage format
export function bridgeSaveGoals() {
  const goals = store.get('mfx_goals') || [];
  const mono  = goals.map(g => ({
    id:       g.id,
    name:     g.name,
    target:   g.targetEUR ?? 0,
    saved:    g.savedEUR  ?? 0,
    deadline: g.deadline,
    color:    g.color || '#4D78D4',
  }));
  try {
    localStorage.setItem(GOALS_KEY, JSON.stringify(mono));
  } catch (e) {
    if (e.name === 'QuotaExceededError') throw e;
  }
}

// Read user preferences from monolith localStorage (read-only, no write needed — prefs stay in same keys)
export function bridgeLoadPrefs() {
  return {
    theme:    localStorage.getItem('monargent-theme')    || 'blue',
    currency: localStorage.getItem('monargent-cur')      || 'EUR',
    username: localStorage.getItem('monargent-username') || '',
    gender:   localStorage.getItem('monargent-usergender') || 'neutral',
  };
}
