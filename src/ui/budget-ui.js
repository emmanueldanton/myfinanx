// ═══ Budget UI — revenue sources + budget items (onglet Budget) ═══
import { store }      from '../store.js';
import { bridgeSave, getRecentMonthsExpenseAverages } from '../data-bridge.js';
import { uid, esc, parseAmt, catIco, COLS } from '../utils.js';
import { fmt, fmtInput, fromDisplay, toDisplay, getActiveCurrency } from '../currency.js';
import { showSuccessToast, showUndoToast }  from './toast.js';
import { openOverlay, closeOverlay }        from './overlay.js';

// Injected by initBudgetUI — returns [Y, M] of the active month
let _getYM = () => { const n = new Date(); return [n.getFullYear(), n.getMonth()]; };


// ── Init (call from src/main.js) ───────────────────────────────────

export function initBudgetUI(getYM) {
  _getYM = getYM;
  window.addRev    = addRev;
  window.delRev    = delRev;
  window.editRev   = editRev;
  window.saveRev   = saveRev;
  window.cancelRev = cancelRev;
  window.addBud    = addBud;
  window.delBud    = delBud;
  window.editBud   = editBud;
  window.saveBud   = saveBud;
  window.cancelBud = cancelBud;
  window.suggestBudget = suggestBudget;
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

// ── Row action buttons (édition / valider / annuler / supprimer) ──
const ICO = {
  edit:   '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
  save:   '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  cancel: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  del:    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>',
};

function _rowActions(prefix, id) {
  return `<div class="row-acts">
      <button class="r-edit"   onclick="edit${prefix}('${id}')"   title="Modifier">${ICO.edit}</button>
      <button class="r-save"   onclick="save${prefix}('${id}')"   title="Valider">${ICO.save}</button>
      <button class="r-cancel" onclick="cancel${prefix}('${id}')" title="Annuler">${ICO.cancel}</button>
      <button class="r-del"    onclick="del${prefix}('${id}')"    title="Supprimer">${ICO.del}</button>
    </div>`;
}

// ── Render ────────────────────────────────────────────────────────

export function renderRevRows(state) {
  const el = document.getElementById('rev-rows');
  if (!el) return;
  const incomes = state?.budget?.incomes ?? [];
  el.innerHTML = incomes.map((r, i) => {
    const col = COLS[i % COLS.length];
    return `<div class="rev-row" data-rev-id="${r.id}">
      <div class="rn">
        <span class="row-view-txt">${esc(r.name)}</span>
        <input type="text" value="${esc(r.name)}" placeholder="Source">
      </div>
      <div class="ra">
        <span class="row-view-txt amt" style="color:${col}">${fmt(r.amountEUR ?? 0)}</span>
        <input type="text" inputmode="decimal" value="${fmtInput(r.amountEUR)}" style="color:${col}">
      </div>
      ${_rowActions('Rev', r.id)}
    </div>`;
  }).join('');
}

export function renderBudRows(state) {
  const el = document.getElementById('bud-rows');
  if (!el) return;
  const budget = state?.budget ?? { incomes: [], budgetItems: [] };
  const items  = budget.budgetItems ?? [];
  const totalR = (budget.incomes ?? []).reduce((s, r) => s + r.amountEUR, 0);
  el.innerHTML = items.map(b => {
    const pct = totalR > 0 ? Math.round((b.allocatedEUR / totalR) * 100) : 0;
    return `<div class="bud-row" data-bud-id="${b.id}">
      <div class="b-ico-wrap" title="Catégorie">${catIco(b.name, 13)}</div>
      <div class="bn">
        <span class="row-view-txt">${esc(b.name)}</span>
        <input type="text" value="${esc(b.name)}" placeholder="Nom du poste">
      </div>
      <div class="ba">
        <span class="row-view-txt amt" style="color:var(--red-l)">${fmt(b.allocatedEUR)}</span>
        <input type="text" inputmode="decimal" value="${fmtInput(b.allocatedEUR)}">
      </div>
      <div class="bp3">${pct}%</div>
      ${_rowActions('Bud', b.id)}
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

export function editRev(id) {
  const row = document.querySelector(`.rev-row[data-rev-id="${id}"]`);
  if (!row) return;
  row.classList.add('editing');
  const inp = row.querySelector('.rn input');
  if (inp) { inp.focus(); inp.select(); }
}

export function saveRev(id) {
  const row = document.querySelector(`.rev-row[data-rev-id="${id}"]`);
  if (!row) return;
  const b = _budget();
  const r = b.incomes.find(x => x.id === id);
  if (r) {
    r.name      = row.querySelector('.rn input').value.trim() || 'Revenu';
    r.amountEUR = fromDisplay(parseAmt(row.querySelector('.ra input').value));
  }
  _mutate(b);   // commit + re-render → la ligne repasse en mode lecture
}

export function cancelRev() {
  // Aucun commit pendant l'édition → on re-rend l'état stocké (annule les saisies)
  renderRevRows({ budget: store.get('mfx_budget') });
}

export function addRev() {
  const n = document.getElementById('nr-n').value.trim() || 'Revenu';
  const a = fromDisplay(parseAmt(document.getElementById('nr-a').value));
  const b = _budget();
  b.incomes.push({ id: uid(), name: n, amountEUR: a });
  document.getElementById('nr-n').value = '';
  document.getElementById('nr-a').value = '';
  _mutate(b);
  showSuccessToast('Revenu ajouté');
}

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

export function editBud(id) {
  const row = document.querySelector(`.bud-row[data-bud-id="${id}"]`);
  if (!row) return;
  row.classList.add('editing');
  const inp = row.querySelector('.bn input');
  if (inp) { inp.focus(); inp.select(); }
}

export function saveBud(id) {
  const row = document.querySelector(`.bud-row[data-bud-id="${id}"]`);
  if (!row) return;
  const b = _budget();
  const item = b.budgetItems.find(x => x.id === id);
  if (item) {
    item.name         = row.querySelector('.bn input').value.trim() || 'Nouveau poste';
    item.allocatedEUR = fromDisplay(parseAmt(row.querySelector('.ba input').value));
  }
  _mutate(b);   // commit + re-render (met aussi à jour l'icône de catégorie)
}

export function cancelBud() {
  renderBudRows({ budget: store.get('mfx_budget') });
}

export function addBud() {
  const n = document.getElementById('nb-n').value.trim() || 'Nouveau poste';
  const a = fromDisplay(parseAmt(document.getElementById('nb-a').value));
  const b = _budget();
  b.budgetItems.push({ id: uid(), name: n, allocatedEUR: a });
  document.getElementById('nb-n').value = '';
  document.getElementById('nb-a').value = '';
  _mutate(b);
  showSuccessToast('Poste budgétaire ajouté');
}

export function delBud(id) {
  const b        = _budget();
  const item     = b.budgetItems.find(x => x.id === id);
  if (!item) return;
  const snapshot = JSON.parse(JSON.stringify(b));
  b.budgetItems  = b.budgetItems.filter(x => x.id !== id);
  _mutate(b);
  showUndoToast(`"${item.name}" supprimé`, () => _mutate(snapshot));
}

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
