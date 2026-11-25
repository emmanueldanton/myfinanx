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

const { occurrencesBetween, loadRules, saveRules } = await import('../src/recurring.js');

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
