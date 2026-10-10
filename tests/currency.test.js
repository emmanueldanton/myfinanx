import { describe, it, expect, beforeEach } from 'vitest';
import { setActiveCurrency, fromDisplay, toDisplay, fmtInput } from '../src/currency.js';

describe('conversion de devises', () => {
  beforeEach(() => setActiveCurrency('EUR'));

  it('5 000 XOF saisis se réaffichent 5 000 XOF', () => {
    setActiveCurrency('XOF');
    const eur = fromDisplay(5000);
    expect(fmtInput(eur)).toBe('5000');
  });

  it('un montant XOF quelconque fait un aller-retour exact', () => {
    setActiveCurrency('XOF');
    for (const v of [1, 150, 2750, 12345, 999999]) {
      expect(Math.round(toDisplay(fromDisplay(v)))).toBe(v);
    }
  });

  it('les centimes en euros sont conservés', () => {
    expect(fromDisplay(12.34)).toBe(12.34);
  });
});
