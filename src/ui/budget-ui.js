// ═══ Budget UI — revenue sources + budget items (onglet Budget) ═══
import { store }      from '../store.js';
import { bridgeSave, getRecentMonthsExpenseAverages } from '../data-bridge.js';
import { uid, esc, parseAmt, catIco, catSubtitle } from '../utils.js';
import { calcByCategory } from '../transactions.js';
import { fmt, fmtInput, fromDisplay, toDisplay, getActiveCurrency } from '../currency.js';
import { showSuccessToast, showUndoToast }  from './toast.js';
import { openOverlay, closeOverlay }        from './overlay.js';

// Injected by initBudgetUI — returns [Y, M] of the active month
let _getYM = () => { const n = new Date(); return [n.getFullYear(), n.getMonth()]; };


// ── Init (call from src/main.js) ───────────────────────────────────

export function initBudgetUI(getYM) {
  _getYM = getYM;
  window.delRev    = delRev;
  window.delBud    = delBud;
  window.suggestBudget = suggestBudget;
  // Écran dédié Revenu / Poste de budget (ajout + édition)
  window.openBudgetScreen     = openBudgetScreen;
  window.openBudgetScreenEdit = openBudgetScreenEdit;
  window.saveBudgetScreen     = saveBudgetScreen;
  // Écran de détail (visualisation) + actions
  window.openItemDetail    = openItemDetail;
  window.editCurrentItem   = editCurrentItem;
  window.deleteCurrentItem = deleteCurrentItem;
}

// ── Helpers ───────────────────────────────────────────────────────

function _budget() {
  return store.get('mfx_budget') ?? { incomes: [], budgetItems: [] };
}

// Commit budget + persist, then re-render. Used by add / delete / save-edit —
// never on every keystroke (édition validée par bouton, pas de commit live).
function _mutate(b) {
  store.set('mfx_budget', b);
  const [Y, M] = _getYM();
  bridgeSave(Y, M);
}

function _setText(id, v) {
  const el = document.getElementById(id);
  if (el) el.textContent = v;
}

// ── Render ────────────────────────────────────────────────────────

const REV_ICO = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>';
const CHEV    = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m9 5l6 7l-6 7"/></svg>';

export function renderRevRows(state) {
  const el = document.getElementById('rev-rows');
  if (!el) return;
  const incomes = state?.budget?.incomes ?? [];
  el.innerHTML = incomes.map((r) =>
    `<div class="rev-row" data-rev-id="${r.id}" role="button" tabindex="0" onclick="openItemDetail('rev','${r.id}')">
      <div class="rev-ico">${REV_ICO}</div>
      <div class="rn">
        <span class="row-view-txt">${esc(r.name)}</span>
      </div>
      <div class="ra">
        <span class="row-view-txt amt">${fmt(r.amountEUR ?? 0)}</span>
      </div>
      <span class="card-chev">${CHEV}</span>
    </div>`
  ).join('');
}

export function renderBudRows(state) {
  const el = document.getElementById('bud-rows');
  if (!el) return;
  const budget = state?.budget ?? { incomes: [], budgetItems: [] };
  const items  = budget.budgetItems ?? [];
  const totalR = (budget.incomes ?? []).reduce((s, r) => s + r.amountEUR, 0);
  const spentByCat = calcByCategory(state?.transactions ?? []);
  el.innerHTML = items.map(b => {
    const pct = totalR > 0 ? Math.round((b.allocatedEUR / totalR) * 100) : 0;
    const spent = spentByCat[b.name] || 0;
    let status;
    if (!(b.allocatedEUR > 0)) status = '<span class="bud-status is-none">Pas de budget</span>';
    else if (spent > 0)        status = '<span class="bud-status is-ok">OK</span>';
    else                       status = '<span class="bud-status is-plan">Prévu</span>';
    const sub = catSubtitle(b.name);
    return `<div class="poste-card bud-row" data-bud-id="${b.id}" role="button" tabindex="0" onclick="openItemDetail('bud','${b.id}')">
      <div class="b-ico-wrap" title="Catégorie">${catIco(b.name, 13)}</div>
      <div class="bn">
        <span class="row-view-txt">${esc(b.name)}</span>
        ${sub ? `<span class="poste-sub">${esc(sub)}</span>` : ''}
      </div>
      <div class="ba-wrap">
        <div class="ba">
          <span class="row-view-txt amt" style="color:var(--red-l)">${fmt(b.allocatedEUR)}</span>
        </div>
        ${status}
      </div>
      <div class="bp3" style="display:none">${pct}%</div>
      <span class="card-chev">${CHEV}</span>
    </div>`;
  }).join('');
}

export function renderBudgetFooter(state) {
  const budget       = state?.budget ?? { incomes: [], budgetItems: [] };
  const transactions = state?.transactions ?? [];
  const incomes      = budget.incomes ?? [];
  const items        = budget.budgetItems ?? [];

  const totalR        = incomes.reduce((s, r) => s + r.amountEUR, 0);
  const totalPonctuel = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amountEUR, 0);
  const totalIncome   = totalR + totalPonctuel;
  const totalB        = items.reduce((s, b) => s + b.allocatedEUR, 0);
  const restB         = totalIncome - totalB;

  _setText('rev-tot', fmt(totalR));

  const ponctuelRow = document.getElementById('bud-ponctuel-row');
  if (ponctuelRow) {
    ponctuelRow.style.display = totalPonctuel > 0 ? '' : 'none';
    _setText('bud-ponctuel-tot', fmt(totalIncome));
    _setText('bud-ponctuel-sub', `dont ${fmt(totalPonctuel)} ponctuels ce mois`);
  }

  _setText('bud-tot', fmt(totalB));
  _setText('bud-tot-pct', (totalIncome > 0 ? Math.round((totalB / totalIncome) * 100) : 0) + '%');

  const br = document.getElementById('bud-reste');
  if (br) {
    br.textContent = (restB >= 0 ? '+' : '') + fmt(Math.abs(restB));
    br.style.color = restB >= 0 ? 'var(--green)' : 'var(--red-l)';
  }

  // Per-row percentages — update in-place to avoid resetting focused inputs
  document.querySelectorAll('.bp3').forEach((el, i) => {
    if (items[i]) el.textContent = totalIncome > 0 ? Math.round((items[i].allocatedEUR / totalIncome) * 100) + '%' : '–';
  });
}

// ── Revenue mutations ─────────────────────────────────────────────

export function delRev(id) {
  const b        = _budget();
  const r        = b.incomes.find(x => x.id === id);
  if (!r) return;
  const snapshot = JSON.parse(JSON.stringify(b));
  b.incomes = b.incomes.filter(x => x.id !== id);
  _mutate(b);
  showUndoToast(`"${r.name}" supprimé`, () => _mutate(snapshot));
}

// ── Budget item mutations ─────────────────────────────────────────

export function delBud(id) {
  const b        = _budget();
  const item     = b.budgetItems.find(x => x.id === id);
  if (!item) return;
  const snapshot = JSON.parse(JSON.stringify(b));
  b.budgetItems  = b.budgetItems.filter(x => x.id !== id);
  _mutate(b);
  showUndoToast(`"${item.name}" supprimé`, () => _mutate(snapshot));
}

// ── Écran de détail (visualisation) d'un revenu ou d'un poste ─────
let _detailKind = 'rev';
let _detailId   = null;

export function openItemDetail(kind, id) {
  _detailKind = kind === 'bud' ? 'bud' : 'rev';
  _detailId   = id;
  const cont = document.getElementById('isc-content');
  if (!cont) return;
  const b   = _budget();
  const tx  = store.get('mfx_transactions') || [];
  const incomes = b.incomes ?? [];
  const items   = b.budgetItems ?? [];
  const totalIncome = incomes.reduce((s, r) => s + r.amountEUR, 0)
    + tx.filter(t => t.type === 'income').reduce((s, t) => s + t.amountEUR, 0);

  if (_detailKind === 'rev') {
    const r = incomes.find(x => x.id === id);
    if (!r) return;
    const part = totalIncome > 0 ? Math.round((r.amountEUR / totalIncome) * 100) : 0;
    _setText('isc-title', 'Revenu attendu');
    cont.innerHTML = `
      <div class="isc-hero isc-rev">
        <div class="isc-ico">${REV_ICO}</div>
        <div class="isc-name">${esc(r.name)}</div>
        <div class="isc-amt">${fmt(r.amountEUR ?? 0)}</div>
        <div class="isc-amt-lbl">par mois</div>
      </div>
      <div class="isc-stats">
        <div class="isc-stat"><span>Part des revenus attendus</span><strong>${part}%</strong></div>
        <div class="isc-stat"><span>Total des revenus</span><strong>${fmt(totalIncome)}</strong></div>
      </div>`;
  } else {
    const it = items.find(x => x.id === id);
    if (!it) return;
    const spent   = calcByCategory(tx)[it.name] || 0;
    const reste   = it.allocatedEUR - spent;
    const usePct  = it.allocatedEUR > 0 ? Math.min(100, Math.round((spent / it.allocatedEUR) * 100)) : 0;
    const overPct = it.allocatedEUR > 0 ? Math.round((spent / it.allocatedEUR) * 100) : 0;
    const part    = totalIncome > 0 ? Math.round((it.allocatedEUR / totalIncome) * 100) : 0;
    const sub     = catSubtitle(it.name);
    const over    = spent > it.allocatedEUR;
    _setText('isc-title', 'Poste de dépense');
    cont.innerHTML = `
      <div class="isc-hero isc-bud">
        <div class="isc-ico">${catIco(it.name, 22)}</div>
        <div class="isc-name">${esc(it.name)}</div>
        ${sub ? `<div class="isc-sub">${esc(sub)}</div>` : ''}
        <div class="isc-amt">${fmt(it.allocatedEUR ?? 0)}</div>
        <div class="isc-amt-lbl">budget alloué</div>
      </div>
      <div class="isc-usage">
        <div class="isc-usage-top">
          <span>${fmt(spent)} dépensé</span>
          <span class="${over ? 'is-over' : ''}">${overPct}%</span>
        </div>
        <div class="isc-bar"><div class="isc-bar-fill ${over ? 'is-over' : ''}" style="width:${usePct}%"></div></div>
      </div>
      <div class="isc-stats">
        <div class="isc-stat"><span>${over ? 'Dépassement' : 'Reste à dépenser'}</span><strong class="${over ? 'v-red' : 'v-green'}">${fmt(Math.abs(reste))}</strong></div>
        <div class="isc-stat"><span>Part des revenus attendus</span><strong>${part}%</strong></div>
      </div>`;
  }
  window.openScreen?.('screen-item');
}

export function editCurrentItem() {
  if (_detailId) openBudgetScreenEdit(_detailKind, _detailId);
}

export function deleteCurrentItem() {
  if (!_detailId) return;
  const id = _detailId, kind = _detailKind;
  window.closeScreen?.();
  if (kind === 'bud') delBud(id); else delRev(id);
}

// ── Écran dédié Revenu / Poste de budget (ajout + édition) ────────
let _budScrKind = 'rev';   // 'rev' (source de revenu) | 'bud' (poste de dépense)
let _budEditId  = null;

export function openBudgetScreen(kind) {
  _budScrKind = kind === 'bud' ? 'bud' : 'rev';
  _budEditId  = null;
  _bsSetVal('bsc-name', '');
  _bsSetVal('bsc-amount', '');
  _applyBudScreenLabels();
  _bsText('bsc-save-lbl', 'Ajouter');
  _setBudCurSym();
  window.openScreen?.('screen-budget');
  setTimeout(() => document.getElementById('bsc-name')?.focus(), 60);
}

export function openBudgetScreenEdit(kind, id) {
  _budScrKind = kind === 'bud' ? 'bud' : 'rev';
  _budEditId  = id;
  const b    = _budget();
  const item = _budScrKind === 'bud'
    ? (b.budgetItems ?? []).find(x => x.id === id)
    : (b.incomes ?? []).find(x => x.id === id);
  if (!item) return;
  _bsSetVal('bsc-name', item.name || '');
  const amt = _budScrKind === 'bud' ? item.allocatedEUR : item.amountEUR;
  _bsSetVal('bsc-amount', amt != null ? fmtInput(amt) : '');
  _applyBudScreenLabels();
  _bsText('bsc-save-lbl', 'Enregistrer');
  _setBudCurSym();
  window.openScreen?.('screen-budget');
}

export function saveBudgetScreen() {
  const name = (document.getElementById('bsc-name')?.value || '').trim();
  const amt  = fromDisplay(parseAmt(document.getElementById('bsc-amount')?.value || ''));
  if (!name) {
    const el = document.getElementById('bsc-name');
    if (el) { el.classList.add('invalid'); setTimeout(() => el.classList.remove('invalid'), 1400); }
    return;
  }
  const b = _budget();
  if (_budScrKind === 'bud') {
    if (_budEditId) {
      const it = (b.budgetItems ?? []).find(x => x.id === _budEditId);
      if (it) { it.name = name; it.allocatedEUR = amt; }
    } else {
      (b.budgetItems ?? (b.budgetItems = [])).push({ id: uid(), name, allocatedEUR: amt });
    }
  } else {
    if (_budEditId) {
      const r = (b.incomes ?? []).find(x => x.id === _budEditId);
      if (r) { r.name = name; r.amountEUR = amt; }
    } else {
      (b.incomes ?? (b.incomes = [])).push({ id: uid(), name, amountEUR: amt });
    }
  }
  _mutate(b);
  window.closeScreen?.();
  showSuccessToast(_budEditId ? 'Modifié' : (_budScrKind === 'bud' ? 'Poste ajouté' : 'Revenu ajouté'));
  _budEditId = null;
}

function _applyBudScreenLabels() {
  const isBud = _budScrKind === 'bud';
  _bsText('bsc-title', _budEditId
    ? (isBud ? 'Modifier le poste' : 'Modifier le revenu')
    : (isBud ? 'Nouveau poste'    : 'Nouveau revenu'));
  _bsText('bsc-name-lbl',   isBud ? 'Nom du poste'   : 'Source de revenu');
  _bsText('bsc-amount-lbl', isBud ? 'Budget alloué'  : 'Montant');
  const nameInp = document.getElementById('bsc-name');
  if (nameInp) nameInp.placeholder = isBud ? 'Ex : Alimentation' : 'Ex : Salaire';
}

function _setBudCurSym() {
  const s = getActiveCurrency().symbol;
  document.querySelectorAll('#screen-budget .scr-cur').forEach(el => { el.textContent = s; });
}
function _bsSetVal(id, v) { const el = document.getElementById(id); if (el) el.value = v; }
function _bsText(id, v)   { const el = document.getElementById(id); if (el) el.textContent = v; }

// ── Répartition de budget assistée par l'IA ───────────────────────

export async function suggestBudget() {
  const btn     = document.getElementById('ai-budget-btn');
  const b       = _budget();
  const totalR  = (b.incomes ?? []).reduce((s, r) => s + r.amountEUR, 0);
  if (totalR <= 0) { showSuccessToast('Renseigne d\'abord tes revenus du mois'); return; }

  if (btn) { btn.disabled = true; btn.classList.add('loading'); }
  try {
    const suggestion = await _fetchBudgetSuggestion(b, totalR);
    if (suggestion) _openBudgetPreview(suggestion, totalR);
    else showSuccessToast('L\'IA n\'a pas pu proposer de répartition — réessaie');
  } catch (e) {
    showSuccessToast('Connexion à l\'IA impossible — réessaie');
  } finally {
    if (btn) { btn.disabled = false; btn.classList.remove('loading'); }
  }
}

async function _fetchBudgetSuggestion(budget, totalR) {
  const [Y, M] = _getYM();
  const cur    = getActiveCurrency();
  const goals  = store.get('mfx_goals') || [];
  const items  = budget.budgetItems ?? [];

  const { byCategory, monthsWithData } = getRecentMonthsExpenseAverages(Y, M, 3);
  const histStr = monthsWithData > 0
    ? Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([c, eur]) => `  - ${c}: ${fmt(eur)} / mois`).join('\n')
    : '  (aucun historique disponible)';

  const goalsStr = goals.length
    ? goals.map(g => {
        const pct = g.targetEUR > 0 ? Math.round((g.savedEUR / g.targetEUR) * 100) : 0;
        return `  - ${g.name}: ${fmt(g.savedEUR)}/${fmt(g.targetEUR)} (${pct}%${g.deadline ? `, échéance ${g.deadline}` : ''})`;
      }).join('\n')
    : '  (aucun objectif défini)';

  const userName = localStorage.getItem('monargent-username');
  const identity = userName ? `Prénom : ${userName}.` : '';

  const system = `Tu es le conseiller financier de MyFinanx. Tu proposes une répartition de budget mensuel réaliste et personnalisée, au format JSON.
${identity}
Devise de l'utilisateur : ${cur.name} (${cur.symbol}). Exprime tous les montants comme des nombres simples dans cette devise (sans symbole, sans séparateur de milliers).
Revenu mensuel total à répartir : ${fmt(totalR)}.
Moyenne des dépenses réelles par catégorie sur les ${monthsWithData} mois précédents :
${histStr}
Objectifs d'épargne :
${goalsStr}
Catégories déjà présentes : ${items.map(i => i.name).join(', ') || '(aucune)'}.

Règles STRICTES :
- La somme de tous les montants ne doit PAS dépasser le revenu total.
- Base-toi sur les moyennes historiques quand elles existent ; sinon propose des montants raisonnables.
- Prévois une part d'épargne cohérente avec les objectifs (ex. un poste "Épargne").
- Réutilise en priorité les catégories existantes ; ajoute-en seulement si pertinent.
- N'invente aucun chiffre non justifié par les données.`;

  const question = `Propose ma répartition de budget mensuel. Réponds UNIQUEMENT en JSON valide selon ce schéma exact :
{"repartition": {"<categorie>": <montant_nombre>, ...}, "note": "<une phrase d'explication, max 25 mots>"}`;

  const res = await fetch('/api/ai', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ messages: [{ role: 'user', content: question }], context: system, temperature: 0.3, maxTokens: 500, json: true }),
  });
  if (!res.ok) return null;

  const data = await res.json();
  let parsed;
  try { parsed = JSON.parse(data.reply); } catch (e) { return null; }
  const rep = parsed?.repartition;
  if (!rep || typeof rep !== 'object') return null;

  const allocations = [];
  for (const [cat, val] of Object.entries(rep)) {
    const amt = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
    if (cat && isFinite(amt) && amt > 0) allocations.push({ cat: String(cat).trim(), amount: amt });
  }
  if (!allocations.length) return null;
  return { allocations, note: (parsed.note || '').toString().trim() };
}

function _openBudgetPreview({ allocations, note }, totalR) {
  const cur            = getActiveCurrency();
  const revenueDisplay = toDisplay(totalR);
  const revStr         = `${revenueDisplay.toLocaleString('fr-FR', { maximumFractionDigits: cur.decimals })} ${cur.symbol}`;
  const existing       = new Set((_budget().budgetItems ?? []).map(i => i.name.toLowerCase().trim()));

  const overlay = document.createElement('div');
  overlay.className = 'aib-overlay';
  overlay.id        = 'aib-overlay';
  overlay.innerHTML = `
    <div class="aib-card" role="dialog" aria-label="Répartition suggérée par l'IA">
      <div class="aib-head"><span>✨ Répartition suggérée</span><button class="aib-x" aria-label="Fermer">✕</button></div>
      ${note ? `<div class="aib-note">${esc(note)}</div>` : ''}
      <div class="aib-list">
        ${allocations.map(a => `<div class="aib-row">
          <span class="aib-cat">${esc(a.cat)}${existing.has(a.cat.toLowerCase().trim()) ? '' : '<span class="aib-new">nouveau</span>'}</span>
          <span class="aib-amtwrap"><input class="aib-amt" data-cat="${esc(a.cat)}" inputmode="decimal" value="${a.amount}"><span class="aib-sym">${cur.symbol}</span></span>
        </div>`).join('')}
      </div>
      <div class="aib-total"><span>Total réparti</span><span><strong id="aib-sum">0</strong> / ${revStr}</span></div>
      <div class="aib-warn" id="aib-warn" style="display:none;">⚠️ La répartition dépasse ton revenu — ajuste les montants.</div>
      <div class="aib-foot">
        <button class="btn bsm aib-cancel">Annuler</button>
        <button class="btn bp bsm aib-apply">Appliquer au budget</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  openOverlay('aib-overlay');

  const recompute = () => {
    let sum = 0;
    overlay.querySelectorAll('.aib-amt').forEach(inp => { sum += parseAmt(inp.value) || 0; });
    overlay.querySelector('#aib-sum').textContent = sum.toLocaleString('fr-FR', { maximumFractionDigits: cur.decimals });
    overlay.querySelector('#aib-warn').style.display = sum > revenueDisplay + 0.01 ? '' : 'none';
  };
  recompute();

  const close = () => { closeOverlay('aib-overlay'); overlay.remove(); };
  overlay.querySelectorAll('.aib-amt').forEach(inp => inp.addEventListener('input', recompute));
  overlay.querySelector('.aib-x').addEventListener('click', close);
  overlay.querySelector('.aib-cancel').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  overlay.querySelector('.aib-apply').addEventListener('click', () => { _applyBudgetAllocation(overlay); close(); });
}

function _applyBudgetAllocation(overlay) {
  const b     = _budget();
  const items = b.budgetItems ?? (b.budgetItems = []);
  const byName = new Map(items.map(it => [it.name.toLowerCase().trim(), it]));

  overlay.querySelectorAll('.aib-amt').forEach(inp => {
    const cat = (inp.dataset.cat || '').trim();
    if (!cat) return;
    const eur = fromDisplay(parseAmt(inp.value));
    const existing = byName.get(cat.toLowerCase());
    if (existing) {
      existing.allocatedEUR = eur;
    } else if (eur > 0) {
      const it = { id: uid(), name: cat, allocatedEUR: eur };
      items.push(it);
      byName.set(cat.toLowerCase(), it);
    }
  });

  _mutate(b);
  showSuccessToast('Budget réparti par l\'IA ✨');
}
