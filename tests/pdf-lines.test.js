import { describe, it, expect } from 'vitest';
import { textItemsToLines } from '../src/scan/prepare.js';

// Fragment pdf.js minimal : texte, position x/y, hauteur 10, largeur approximative
const item = (str, x, y, w = str.length * 5) => ({ str, transform: [10, 0, 0, 10, x, y], width: w, height: 10 });

describe('textItemsToLines', () => {
  const items = [
    item('Date', 30, 700), item('Libellé', 100, 700), item('Débit', 400, 700), item('Crédit', 480, 700),
    item('12/09/2026', 30, 680), item('CB TOTALENERGIES RIVIERA 3', 100, 680), item('15 000', 400, 680),
    item('02/09/2026', 30, 660), item('VIR SALAIRE', 100, 660), item('650 000', 480, 660),
  ];
  const lines = textItemsToLines(items).split('\n');

  it('sépare le libellé du montant (plus de « 315 000 »)', () => {
    expect(lines[1]).toContain('RIVIERA 3 | débit 15 000');
  });
  it('étiquette les montants selon la colonne Débit ou Crédit', () => {
    expect(lines[2]).toContain('VIR SALAIRE | crédit 650 000');
  });
  it('garde l\'ordre de lecture de haut en bas', () => {
    expect(lines[0]).toMatch(/^Date \| Libellé \| Débit \| Crédit$/);
  });
});
