import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/ui/toast.js', () => ({ showSuccessToast: vi.fn() }));

// Vitest tourne sous node : localStorage adossé à une Map
const _mem = new Map();
globalThis.localStorage = {
  getItem: k => (_mem.has(k) ? _mem.get(k) : null),
  setItem: (k, v) => { _mem.set(k, String(v)); },
  removeItem: k => { _mem.delete(k); },
};

const { announceCrossing } = await import('../src/ui/category-toast.js');
const { showSuccessToast } = await import('../src/ui/toast.js');
const { store } = await import('../src/store.js');

const budget = { budgetItems: [{ id: 'a', name: 'Alimentation', allocatedEUR: 100 }] };
const tx = n => ({ id: 't' + n, category: 'Alimentation', amountEUR: n, type: 'expense', date: '2026-11-10' });

describe('announceCrossing', () => {
  beforeEach(() => {
    _mem.clear();
    store.remove('mfx_cat_alerts_2026_11');
    showSuccessToast.mockClear();
  });

  it('annonce le palier 80 % au passage de 40 à 85', () => {
    const shown = announceCrossing(budget, [tx(40)], [tx(40), tx(45)], 2026, 10);
    expect(shown).toBe(true);
    expect(showSuccessToast).toHaveBeenCalledTimes(1);
    expect(showSuccessToast.mock.calls[0][0]).toContain('80 % du budget atteint');
  });

  it('ne répète pas un palier déjà annoncé', () => {
    announceCrossing(budget, [tx(40)], [tx(40), tx(45)], 2026, 10);
    showSuccessToast.mockClear();
    const shown = announceCrossing(budget, [tx(40)], [tx(40), tx(45)], 2026, 10);
    expect(shown).toBe(false);
    expect(showSuccessToast).not.toHaveBeenCalled();
  });

  it('renvoie false sans franchissement', () => {
    expect(announceCrossing(budget, [tx(10)], [tx(10), tx(5)], 2026, 10)).toBe(false);
    expect(showSuccessToast).not.toHaveBeenCalled();
  });
});
