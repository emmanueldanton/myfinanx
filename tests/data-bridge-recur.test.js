import { describe, it, expect, beforeEach } from 'vitest';

// Vitest tourne sous node : localStorage adossé à une Map
const _mem = new Map();
globalThis.localStorage = {
  getItem: k => (_mem.has(k) ? _mem.get(k) : null),
  setItem: (k, v) => { _mem.set(k, String(v)); },
  removeItem: k => { _mem.delete(k); },
  key: i => [..._mem.keys()][i] ?? null,
  get length() { return _mem.size; },
};

const { store } = await import('../src/store.js');
const { bridgeLoad, bridgeSave, readMonthTransactions, appendToMonth } = await import('../src/data-bridge.js');

const tx = (id, extra = {}) => ({ id, date: '2026-11-05', type: 'expense', description: 'Loyer', category: 'Logement', amountEUR: 500, ...extra });

describe('recurId dans le stockage mensuel', () => {
  beforeEach(() => _mem.clear());

  it('bridgeSave puis bridgeLoad garde recurId', () => {
    store.set('mfx_budget', { incomes: [], budgetItems: [] });
    store.set('mfx_transactions', [tx('a', { recurId: 'r1' }), tx('b')]);
    bridgeSave(2026, 10);
    bridgeLoad(2026, 10);
    const txs = store.get('mfx_transactions');
    expect(txs.find(t => t.id === 'a').recurId).toBe('r1');
    expect(txs.find(t => t.id === 'b').recurId).toBeUndefined();
  });

  it('n\'écrit pas recurId pour une opération ordinaire', () => {
    store.set('mfx_budget', { incomes: [], budgetItems: [] });
    store.set('mfx_transactions', [tx('b')]);
    bridgeSave(2026, 10);
    const mono = JSON.parse(_mem.get('monargent_2026_11'));
    expect('recurId' in mono.expenses[0]).toBe(false);
  });

  it('appendToMonth et readMonthTransactions gardent recurId', () => {
    appendToMonth(2026, 9, [tx('c', { date: '2026-10-05', recurId: 'r1' })]);
    expect(readMonthTransactions(2026, 9)[0].recurId).toBe('r1');
  });
});
