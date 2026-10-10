// ═══ Scan : préparation de la liste à valider (fonctions pures, testées) ═══

// Montant lu dans la devise du document -> EUR (devise de stockage de l'app).
// Devise inconnue ou absente : on suppose la devise d'affichage de l'utilisateur.
export function toEUR(amount, docCurrency, activeCode, currencies) {
  const code = docCurrency && currencies[docCurrency] ? docCurrency : activeCode;
  const rate = currencies[code]?.rate || 1;
  return Math.round((amount / rate) * 1e6) / 1e6;
}

export function monthOf(dateISO) {
  const [y, m] = dateISO.split('-').map(Number);
  return { Y: y, M: m - 1 };
}

// Une opération déjà saisie le même jour, du même type, pour le même montant (±1 %) est un doublon probable.
export function isLikelyDuplicate(item, existing) {
  return existing.some(e =>
    (e.type === 'income') === (item.type === 'income') &&
    e.date === item.date &&
    Math.abs((e.amountEUR ?? 0) - item.amountEUR) <= Math.max(0.01, item.amountEUR * 0.01)
  );
}

// result : sortie de /api/scan ; existingFor(Y, M) : transactions déjà enregistrées pour ce mois.
export function buildReviewItems(result, { activeCode, currencies, existingFor }) {
  const items = (result?.items || []).map((it, i) => {
    const amountEUR = toEUR(it.amount, it.currency || result.currency, activeCode, currencies);
    const row = {
      key: 'scan-' + i,
      date: it.date,
      description: it.description,
      category: it.category,
      type: it.type,
      amountEUR,
      sourceCurrency: it.currency || result.currency || null,
      sourceAmount: it.amount,
    };
    const { Y, M } = monthOf(it.date);
    row.duplicate = isLikelyDuplicate(row, existingFor(Y, M));
    row.selected = !row.duplicate;
    return row;
  });
  // Doublons à l'intérieur du même document (ex. relevé où la même ligne apparaît deux fois) : on garde les deux, cochés.
  return items;
}

// Regroupe les lignes retenues par mois : { 'YYYY-MM': { Y, M, rows: [...] } }
export function groupByMonth(rows) {
  const out = {};
  for (const r of rows) {
    const { Y, M } = monthOf(r.date);
    const k = `${Y}-${String(M + 1).padStart(2, '0')}`;
    (out[k] ||= { Y, M, rows: [] }).rows.push(r);
  }
  return out;
}
