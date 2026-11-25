import { describe, it, expect } from 'vitest';
import { categoryAlerts, newCrossing, pushCategory } from '../src/budget.js';

const items = [
  { id: 'a', name: 'Alimentation', allocatedEUR: 100 },
  { id: 't', name: 'Transport', allocatedEUR: 50 },
  { id: 'z', name: 'Loisirs', allocatedEUR: 0 },
];
const ex = (category, amountEUR) => ({ type: 'expense', category, amountEUR });

describe('categoryAlerts', () => {
  it('paliers 0, 50, 80, 100', () => {
    const r = (n) => categoryAlerts(items, [ex('Alimentation', n)])[0];
    expect(r(49).level).toBe(0);
    expect(r(50).level).toBe(50);
    expect(r(80).level).toBe(80);
    expect(r(100).level).toBe(100);
    expect(r(230)).toMatchObject({ level: 100, pct: 230, spentEUR: 230 });
  });
  it('ignore les postes sans budget et les revenus', () => {
    const r = categoryAlerts(items, [ex('Loisirs', 10), { type: 'income', category: 'Alimentation', amountEUR: 500 }]);
    expect(r.map(a => a.id)).toEqual(['a', 't']);
    expect(r[0].spentEUR).toBe(0);
  });
});

describe('newCrossing', () => {
  const at = (id, level, pct = level) => ({ id, name: id, level, pct });
  it('un seul franchissement, le plus haut', () => {
    expect(newCrossing([at('a', 0)], [at('a', 80)], {})).toEqual({ id: 'a', name: 'a', level: 80 });
  });
  it('déjà annoncé ce mois : rien', () => {
    expect(newCrossing([at('a', 0)], [at('a', 80)], { a: 80 })).toBeNull();
  });
  it('redescente : rien', () => {
    expect(newCrossing([at('a', 80)], [at('a', 50)], {})).toBeNull();
  });
  it('plusieurs postes : palier puis pct le plus haut', () => {
    const r = newCrossing([at('a', 0), at('t', 0)], [at('a', 80, 85), at('t', 80, 95)], {});
    expect(r.id).toBe('t');
  });
});

describe('pushCategory', () => {
  it('rien sous 80 %, sinon le plus avancé', () => {
    expect(pushCategory([{ level: 50, pct: 70 }])).toBeNull();
    expect(pushCategory([{ id: 'a', level: 80, pct: 85 }, { id: 't', level: 100, pct: 120 }]).id).toBe('t');
  });
});
