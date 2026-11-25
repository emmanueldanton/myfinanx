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

const { occurrencesBetween, loadRules, saveRules, generateDue, makeRule, activeRuleFor } = await import('../src/recurring.js');
const { store } = await import('../src/store.js');
const { readMonthTransactions } = await import('../src/data-bridge.js');

const rule = (freq, startDate) => ({ id: 'r1', freq, startDate, lastDate: startDate, active: true });

describe('occurrencesBetween', () => {
  it('mensuel ancré le 31 : fin de mois sans dérive', () => {
    expect(occurrencesBetween(rule('month', '2026-01-31'), '2026-01-31', '2026-04-30'))
      .toEqual(['2026-02-28', '2026-03-31', '2026-04-30']);
  });

  it('mensuel du 31 en année bissextile : 29 février', () => {
    expect(occurrencesBetween(rule('month', '2028-01-31'), '2028-01-31', '2028-02-29'))
      .toEqual(['2028-02-29']);
  });

  it('hebdomadaire', () => {
    expect(occurrencesBetween(rule('week', '2026-11-02'), '2026-11-02', '2026-11-25'))
      .toEqual(['2026-11-09', '2026-11-16', '2026-11-23']);
  });

  it('trimestriel', () => {
    expect(occurrencesBetween(rule('quarter', '2026-01-15'), '2026-01-15', '2026-11-25'))
      .toEqual(['2026-04-15', '2026-07-15', '2026-10-15']);
  });

  it('rien quand après vaut aujourd\'hui', () => {
    expect(occurrencesBetween(rule('month', '2026-11-05'), '2026-11-25', '2026-11-25')).toEqual([]);
  });

  it('rien quand aujourd\'hui précède le début', () => {
    expect(occurrencesBetween(rule('month', '2026-12-05'), '2026-12-05', '2026-11-25')).toEqual([]);
  });
});

describe('loadRules / saveRules', () => {
  beforeEach(() => _mem.clear());

  it('liste vide si la clé est absente ou illisible', () => {
    expect(loadRules()).toEqual([]);
    _mem.set('mfx_recurring', '{pas du json');
    expect(loadRules()).toEqual([]);
    _mem.set('mfx_recurring', '{"a":1}');
    expect(loadRules()).toEqual([]);
  });

  it('aller-retour', () => {
    const rules = [{ ...rule('week', '2026-11-02'), description: 'Navigo', category: 'Transport', amountEUR: 22 }];
    saveRules(rules);
    expect(loadRules()).toEqual(rules);
  });
});

describe('generateDue', () => {
  const loyer = (extra = {}) => ({
    id: 'r1', description: 'Loyer', category: 'Logement', amountEUR: 500,
    freq: 'month', startDate: '2026-09-05', lastDate: '2026-09-05', active: true, ...extra,
  });

  beforeEach(() => {
    _mem.clear();
    store.set('mfx_budget', { incomes: [], budgetItems: [] });
    store.set('mfx_transactions', []);
  });

  it('crée les occurrences échues, chacune dans son mois', () => {
    saveRules([loyer()]);
    expect(generateDue('2026-11-25', [2026, 10])).toBe(2);
    const oct = readMonthTransactions(2026, 9);
    expect(oct).toHaveLength(1);
    expect(oct[0]).toMatchObject({ date: '2026-10-05', recurId: 'r1', type: 'expense', description: 'Loyer', category: 'Logement', amountEUR: 500 });
    const nov = store.get('mfx_transactions');
    expect(nov).toHaveLength(1);
    expect(nov[0]).toMatchObject({ date: '2026-11-05', recurId: 'r1' });
    expect(readMonthTransactions(2026, 10)).toHaveLength(1);
    expect(loadRules()[0].lastDate).toBe('2026-11-05');
  });

  it('aucun doublon au second appel le même jour', () => {
    saveRules([loyer()]);
    generateDue('2026-11-25', [2026, 10]);
    expect(generateDue('2026-11-25', [2026, 10])).toBe(0);
    expect(store.get('mfx_transactions')).toHaveLength(1);
  });

  it('une occurrence supprimée n\'est pas recréée', () => {
    saveRules([loyer()]);
    generateDue('2026-11-25', [2026, 10]);
    store.set('mfx_transactions', []);
    expect(generateDue('2026-11-25', [2026, 10])).toBe(0);
  });

  it('une règle arrêtée ne crée rien', () => {
    saveRules([loyer({ active: false })]);
    expect(generateDue('2026-11-25', [2026, 10])).toBe(0);
  });
});

describe('makeRule / activeRuleFor', () => {
  it('makeRule part de l\'opération saisie', () => {
    const r = makeRule({ description: 'Netflix', category: 'Abonnements', amountEUR: 13.49, date: '2026-11-08' }, 'month');
    expect(r).toMatchObject({ description: 'Netflix', category: 'Abonnements', amountEUR: 13.49, freq: 'month', startDate: '2026-11-08', lastDate: '2026-11-08', active: true });
    expect(typeof r.id).toBe('string');
  });

  it('activeRuleFor trouve la règle active de l\'opération, sinon null', () => {
    const rules = [{ id: 'r1', active: true }, { id: 'r2', active: false }];
    expect(activeRuleFor({ recurId: 'r1' }, rules)).toEqual(rules[0]);
    expect(activeRuleFor({ recurId: 'r2' }, rules)).toBeNull();
    expect(activeRuleFor({}, rules)).toBeNull();
    expect(activeRuleFor({ recurId: 'inconnu' }, rules)).toBeNull();
  });
});
