import { describe, it, expect } from 'vitest';
import { fmtDate } from '../src/utils.js';

describe('fmtDate', () => {
  it('formate une vraie date', () => {
    expect(fmtDate('2024-01-05')).toBe('5 jan 2024');
  });
  it("ne renvoie jamais un texte qui n'est pas une date (inséré dans le HTML)", () => {
    expect(fmtDate('<img src=x onerror=alert(1)>')).toBe('');
    expect(fmtDate('2024-01')).toBe('');
    expect(fmtDate(undefined)).toBe('');
  });
});
