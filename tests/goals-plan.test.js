import { describe, it, expect } from 'vitest';
import { paidInMonth, dueInMonth, leftToPayInMonth, monthsToReach, finishMonth, requiredMonthly } from '../src/goals.js';

const base = { targetEUR: 300, savedEUR: 0, deposits: [] };

describe('plan mensuel', () => {
  it('le mois attend la mensualité', () => {
    const g = { ...base, plan: 'monthly', monthlyEUR: 50 };
    expect(dueInMonth(g, 2026, 9)).toBe(50);
    expect(leftToPayInMonth(g, 2026, 9)).toBe(50);
  });
  it('les versements du mois réduisent le reste à verser', () => {
    const g = { ...base, plan: 'monthly', monthlyEUR: 50, savedEUR: 20, deposits: [{ d: '2026-10-03', a: 20 }, { d: '2026-09-28', a: 99 }] };
    expect(paidInMonth(g, 2026, 9)).toBe(20);
    expect(leftToPayInMonth(g, 2026, 9)).toBe(30);
  });
  it('le dernier mois ne demande que ce qui manque', () => {
    const g = { ...base, plan: 'monthly', monthlyEUR: 50, savedEUR: 280 };
    expect(dueInMonth(g, 2026, 9)).toBe(20);
  });
  it('objectif atteint ce mois-ci : le mois est rempli', () => {
    const g = { ...base, plan: 'monthly', monthlyEUR: 50, savedEUR: 300, deposits: [{ d: '2026-10-05', a: 30 }] };
    expect(dueInMonth(g, 2026, 9)).toBe(30);
    expect(leftToPayInMonth(g, 2026, 9)).toBe(0);
  });
  it('durée et mois de fin', () => {
    const g = { ...base, plan: 'monthly', monthlyEUR: 50, savedEUR: 20 };
    expect(monthsToReach(g, 2026, 9)).toBe(6);
    expect(finishMonth(g, 2026, 9)).toEqual({ Y: 2027, M: 2 });
    expect(monthsToReach({ ...g, monthlyEUR: 0 })).toBeNull();
  });
  it('le mois déjà versé ne décale pas la date de fin', () => {
    const avant = { ...base, plan: 'monthly', monthlyEUR: 75 };
    const apres = { ...avant, savedEUR: 75, deposits: [{ d: '2026-10-27', a: 75 }] };
    expect(finishMonth(avant, 2026, 9)).toEqual({ Y: 2027, M: 0 });
    expect(finishMonth(apres, 2026, 9)).toEqual({ Y: 2027, M: 0 });
    expect(monthsToReach(apres, 2026, 9)).toBe(3);
  });
  it('versement partiel du mois', () => {
    const g = { ...base, plan: 'monthly', monthlyEUR: 100, savedEUR: 40, deposits: [{ d: '2026-10-02', a: 40 }] };
    expect(finishMonth(g, 2026, 9)).toEqual({ Y: 2026, M: 11 });
  });
});

describe('paiement en une fois', () => {
  const g = { ...base, plan: 'once', deadline: '2026-12-15', savedEUR: 100 };
  it('rien à verser avant le mois prévu', () => {
    expect(dueInMonth(g, 2026, 9)).toBe(0);
  });
  it('tout le reste est dû le mois prévu', () => {
    expect(leftToPayInMonth(g, 2026, 11)).toBe(200);
  });
});

describe('mensualité pour une échéance', () => {
  it('répartit le reste sur les mois restants, mois en cours compris', () => {
    expect(requiredMonthly({ ...base, deadline: '2026-12-31' }, 2026, 9)).toBe(100);
  });
  it('échéance passée ou absente', () => {
    expect(requiredMonthly({ ...base, deadline: '2026-01-01' }, 2026, 9)).toBeNull();
    expect(requiredMonthly(base, 2026, 9)).toBeNull();
  });
});
