import { describe, it, expect } from 'vitest';
import { toEUR, isLikelyDuplicate, buildReviewItems, groupByMonth } from '../src/scan/review.js';

const CUR = { EUR: { rate: 1 }, XOF: { rate: 655.957 }, USD: { rate: 1.12 } };

describe('toEUR', () => {
  it('convertit depuis la devise du document', () => {
    expect(Math.round(toEUR(655.957, 'XOF', 'EUR', CUR) * 100) / 100).toBe(1);
  });
  it('devise inconnue : suppose la devise d\'affichage', () => {
    expect(toEUR(1312, 'ZZZ', 'XOF', CUR)).toBeCloseTo(2, 3);
    expect(toEUR(10, null, 'EUR', CUR)).toBe(10);
  });
});

describe('doublons', () => {
  const existing = [{ date: '2026-10-05', amountEUR: 19.06, type: 'expense' }];
  it('même jour, même montant à 1 % près : doublon', () => {
    expect(isLikelyDuplicate({ date: '2026-10-05', amountEUR: 19.1, type: 'expense' }, existing)).toBe(true);
  });
  it('autre jour ou revenu : pas un doublon', () => {
    expect(isLikelyDuplicate({ date: '2026-10-06', amountEUR: 19.06, type: 'expense' }, existing)).toBe(false);
    expect(isLikelyDuplicate({ date: '2026-10-05', amountEUR: 19.06, type: 'income' }, existing)).toBe(false);
  });
});

describe('buildReviewItems', () => {
  it('décoche les doublons probables et coche le reste', () => {
    const result = { currency: 'XOF', items: [
      { date: '2026-10-05', description: 'Carrefour', amount: 12500, type: 'expense', category: 'Alimentation', currency: 'XOF' },
      { date: '2026-09-28', description: 'Boulangerie', amount: 1500, type: 'expense', category: 'Alimentation', currency: null },
    ] };
    const existingFor = (Y, M) => (Y === 2026 && M === 9) ? [{ date: '2026-10-05', amountEUR: 12500 / 655.957, type: 'expense' }] : [];
    const rows = buildReviewItems(result, { activeCode: 'XOF', currencies: CUR, existingFor });
    expect(rows[0].duplicate).toBe(true);
    expect(rows[0].selected).toBe(false);
    expect(rows[1].selected).toBe(true);
    expect(Math.round(rows[1].amountEUR * 655.957)).toBe(1500);
  });
});

describe('groupByMonth', () => {
  it('range chaque ligne dans le mois de sa date', () => {
    const g = groupByMonth([{ date: '2026-10-05' }, { date: '2026-09-28' }, { date: '2026-10-01' }]);
    expect(Object.keys(g).sort()).toEqual(['2026-09', '2026-10']);
    expect(g['2026-10'].M).toBe(9);
    expect(g['2026-10'].rows).toHaveLength(2);
  });
});
