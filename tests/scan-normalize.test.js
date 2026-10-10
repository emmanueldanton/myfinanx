import { describe, it, expect } from 'vitest';
import { parseAmount, normalizeDate, normalizeCurrency, normalizeScan } from '../api/_lib/scan-normalize.js';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, buildScanPrompt } from '../api/scan.js';
import { CATS_E, CATS_I } from '../src/utils.js';

const opts = { expenseCategories: EXPENSE_CATEGORIES, incomeCategories: INCOME_CATEGORIES, today: '2026-10-11' };

describe('parseAmount', () => {
  it.each([
    [12.5, 12.5], ['12,50', 12.5], ['1 250,50', 1250.5], ['1.250,50', 1250.5],
    ['1,250.50', 1250.5], ['12.500', 12500], ['12 500 F', 12500], ['2 000 000 FCFA', 2000000],
    ['-35,90 €', 35.9], ['abc', NaN],
  ])('%s -> %s', (v, expected) => {
    expect(parseAmount(v)).toBe(expected);
  });
});

describe('normalizeDate', () => {
  it('accepte ISO et format français', () => {
    expect(normalizeDate('2026-09-03', '2026-10-11')).toBe('2026-09-03');
    expect(normalizeDate('03/09/2026', '2026-10-11')).toBe('2026-09-03');
    expect(normalizeDate('3.9.26', '2026-10-11')).toBe('2026-09-03');
  });
  it('remplace une date absente, invalide ou future par aujourd\'hui', () => {
    expect(normalizeDate(null, '2026-10-11')).toBe('2026-10-11');
    expect(normalizeDate('31/02/2026', '2026-10-11')).toBe('2026-10-11');
    expect(normalizeDate('2027-01-01', '2026-10-11')).toBe('2026-10-11');
  });
});

describe('normalizeCurrency', () => {
  it('reconnaît le franc CFA sous ses différentes écritures', () => {
    expect(normalizeCurrency('FCFA')).toBe('XOF');
    expect(normalizeCurrency('f cfa')).toBe('XOF');
    expect(normalizeCurrency('€')).toBe('EUR');
    expect(normalizeCurrency('n/a')).toBe(null);
  });
});

describe('normalizeScan', () => {
  it('nettoie une réponse IA imparfaite', () => {
    const r = normalizeScan({
      docType: 'Ticket', merchant: 'Carrefour', currency: 'FCFA',
      operations: [
        { date: '05/10/2026', description: 'Carrefour, courses', amount: '12 500', type: 'expense', category: 'alimentation' },
        { date: null, description: '', amount: 0, type: 'expense', category: 'x' },
        { date: '2026-10-01', description: 'Virement salaire', amount: 250000, type: 'crédit', category: 'salaire' },
      ],
    }, opts);
    expect(r.docType).toBe('ticket');
    expect(r.items).toHaveLength(2);
    expect(r.items[0]).toEqual({ date: '2026-10-05', description: 'Carrefour, courses', amount: 12500, type: 'expense', category: 'Alimentation', currency: 'XOF' });
    expect(r.items[1].type).toBe('income');
    expect(r.items[1].category).toBe('Salaire');
  });
  it('renvoie le message d\'erreur quand rien n\'est lisible', () => {
    const r = normalizeScan({ operations: [], error: 'Photo floue' }, opts);
    expect(r.items).toEqual([]);
    expect(r.error).toBe('Photo floue');
  });
  it('résiste à une réponse vide ou malformée', () => {
    expect(normalizeScan(null, opts).items).toEqual([]);
    expect(normalizeScan({ operations: 'nope' }, opts).items).toEqual([]);
  });
  it('catégorie inconnue -> Autre', () => {
    const r = normalizeScan({ operations: [{ amount: 10, category: 'Jardinage' }] }, opts);
    expect(r.items[0].category).toBe('Autre');
  });
});

describe('cohérence avec l\'application', () => {
  it('les catégories du serveur sont celles de l\'app', () => {
    expect(EXPENSE_CATEGORIES).toEqual(CATS_E);
    expect(INCOME_CATEGORIES).toEqual(CATS_I);
  });
  it('le prompt ne contient aucun tiret cadratin', () => {
    expect(buildScanPrompt('2026-10-11', 'XOF')).not.toMatch(/[–—]/);
  });
});
