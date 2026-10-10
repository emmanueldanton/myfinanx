// ═══ Scanner un ticket, une facture ou un relevé (photo / PDF) ═══
// Parcours : choisir le document -> lecture par l'IA -> vérification -> ajout.
// Rien n'est enregistré sans la validation explicite de l'utilisateur.

import { store } from '../store.js';
import { bridgeSave, readMonthTransactions, appendToMonth } from '../data-bridge.js';
import { CURRENCIES, getActiveCurrency, fmt, fmtInput, fromDisplay } from '../currency.js';
import { uid, esc, parseAmt, CATS_E, CATS_I, todayISO, MONTHS } from '../utils.js';
import { showSuccessToast } from './toast.js';
import { prepareFiles } from '../scan/prepare.js';
import { buildReviewItems, groupByMonth } from '../scan/review.js';
import { buildCorpus, guessCategory } from './expense-intel.js';

let _getYM = () => [new Date().getFullYear(), new Date().getMonth()];
let _rows = [];
let _meta = null;
let _slowTimer = null;

const $ = id => document.getElementById(id);

function _state(name) {
  ['pick', 'busy', 'error', 'review'].forEach(s => {
    const el = $('scan-' + s);
    if (el) el.hidden = s !== name;
  });
  const foot = $('scan-foot');
  if (foot) foot.hidden = name !== 'review';
}

export function openScanScreen() {
  _rows = []; _meta = null;
  ['scan-in-camera', 'scan-in-image', 'scan-in-pdf'].forEach(id => { const i = $(id); if (i) i.value = ''; });
  _state('pick');
  window.openScreen?.('screen-scan');
}

function _setBusy(step, preview) {
  _state('busy');
  const s = $('scan-busy-step');
  if (s) s.textContent = step;
  const p = $('scan-busy-preview');
  if (p && preview !== undefined) {
    p.innerHTML = preview ? `<img src="${preview}" alt="Aperçu du document">` : '';
  }
}

function _showError(msg) {
  const m = $('scan-error-msg');
  if (m) m.textContent = msg;
  _state('error');
}

async function _onFiles(files) {
  if (!files || !files.length) return;
  clearTimeout(_slowTimer);
  try {
    _setBusy('Préparation du document…', '');
    const payload = await prepareFiles(files);
    _setBusy(payload.text ? 'Lecture du relevé par l\'IA…' : 'Lecture du ticket par l\'IA…', payload.images?.[0] || '');
    // Le service gratuit peut faire patienter quelques secondes aux heures chargées : on le dit.
    _slowTimer = setTimeout(() => {
      const sub = document.querySelector('.scan-busy-sub');
      if (sub) sub.textContent = 'Le service est très demandé en ce moment, encore quelques secondes…';
    }, 6000);

    const res = await fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, today: todayISO(), currency: getActiveCurrency().code }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'La lecture a échoué, réessaie.');
    if (!data.items?.length) {
      throw new Error(data.error
        ? `Rien à ajouter : ${data.error}`
        : 'Aucun montant trouvé. Essaie une photo plus nette, bien à plat et bien éclairée.');
    }

    const [cY, cM] = _getYM();
    _meta = data;
    _rows = buildReviewItems(data, {
      activeCode: getActiveCurrency().code,
      currencies: CURRENCIES,
      existingFor: (Y, M) => (Y === cY && M === cM) ? (store.get('mfx_transactions') || []) : readMonthTransactions(Y, M),
    });
    // Catégorie restée « Autre » : on s'appuie sur l'historique de l'utilisateur (libellés déjà classés)
    buildCorpus();
    _rows.forEach(r => {
      if (r.type === 'expense' && r.category === 'Autre') {
        const g = guessCategory(r.description);
        if (g && CATS_E.includes(g)) r.category = g;
      }
    });
    _renderReview();
  } catch (e) {
    clearTimeout(_slowTimer);
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    _showError(offline ? 'Pas de connexion internet. Le scan a besoin du réseau, réessaie une fois connecté.' : (e.message || 'La lecture a échoué, réessaie.'));
  }
}

const DOC_LABEL = { ticket: 'Ticket', facture: 'Facture', releve: 'Relevé', autre: 'Document' };

function _renderReview() {
  clearTimeout(_slowTimer);
  _state('review');
  const n = _rows.length;
  const dups = _rows.filter(r => r.duplicate).length;
  const doc = DOC_LABEL[_meta?.docType] || 'Document';
  $('scan-sum').innerHTML = `
    <div class="scan-sum-title">${n} opération${n > 1 ? 's' : ''} trouvée${n > 1 ? 's' : ''}</div>
    <div class="scan-sum-sub">${esc(doc)}${_meta?.merchant ? ' · ' + esc(_meta.merchant) : ''}</div>
    <p class="scan-sum-hint">Vérifie chaque ligne, corrige si besoin, puis valide. Décoche ce que tu ne veux pas ajouter.</p>
    ${dups ? `<p class="scan-sum-warn">${dups} ligne${dups > 1 ? 's semblent' : ' semble'} déjà saisie${dups > 1 ? 's' : ''} : décochée${dups > 1 ? 's' : ''} par sécurité.</p>` : ''}`;

  const cur = getActiveCurrency();
  const list = $('scan-list');
  list.innerHTML = _rows.map((r, i) => {
    const cats = r.type === 'income' ? CATS_I : CATS_E;
    const converted = r.sourceCurrency && r.sourceCurrency !== cur.code && CURRENCIES[r.sourceCurrency];
    return `<div class="scan-row${r.selected ? '' : ' off'}" data-i="${i}">
      <label class="scan-check">
        <input type="checkbox" ${r.selected ? 'checked' : ''} data-f="selected" aria-label="Ajouter cette opération">
        <span class="scan-type ${r.type === 'income' ? 'in' : 'out'}">${r.type === 'income' ? 'Revenu' : 'Dépense'}</span>
        ${r.duplicate ? '<span class="scan-dup">Déjà saisie ?</span>' : ''}
      </label>
      <input class="scan-desc" type="text" value="${esc(r.description)}" data-f="description" aria-label="Description">
      <div class="scan-grid">
        <label class="scan-fld"><span>Montant (${esc(cur.symbol)})</span>
          <input type="text" inputmode="decimal" value="${fmtInput(r.amountEUR)}" data-f="amount"></label>
        <label class="scan-fld"><span>Date</span>
          <input type="date" value="${esc(r.date)}" max="${todayISO()}" data-f="date"></label>
      </div>
      <label class="scan-fld"><span>Catégorie</span>
        <select data-f="category">${cats.map(c => `<option value="${esc(c)}"${c === r.category ? ' selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
      ${converted ? `<div class="scan-conv">Lu sur le document : ${_fmtSource(r)}, converti en ${esc(cur.name.toLowerCase())}.</div>` : ''}
    </div>`;
  }).join('');
  _updateFoot();
}

function _fmtSource(r) {
  const c = CURRENCIES[r.sourceCurrency];
  const n = Number(r.sourceAmount).toLocaleString('fr-FR', { maximumFractionDigits: c?.decimals ?? 2 });
  return esc(`${n} ${r.sourceCurrency === 'XOF' ? 'FCFA' : (c?.symbol || r.sourceCurrency)}`);
}

function _updateFoot() {
  const sel = _rows.filter(r => r.selected);
  const btn = $('scan-save');
  const lbl = $('scan-save-lbl');
  if (btn) btn.disabled = !sel.length;
  if (lbl) {
    const total = sel.filter(r => r.type !== 'income').reduce((s, r) => s + r.amountEUR, 0);
    lbl.textContent = sel.length
      ? `Ajouter ${sel.length} opération${sel.length > 1 ? 's' : ''}${total ? ' · ' + fmt(total) : ''}`
      : 'Coche au moins une ligne';
  }
}

function _onListInput(e) {
  const t = e.target;
  const f = t.dataset?.f;
  const rowEl = t.closest('.scan-row');
  if (!f || !rowEl) return;
  const r = _rows[+rowEl.dataset.i];
  if (!r) return;
  if (f === 'selected') { r.selected = t.checked; rowEl.classList.toggle('off', !t.checked); }
  else if (f === 'description') r.description = t.value;
  else if (f === 'amount') { const v = parseAmt(t.value); r.amountEUR = v > 0 ? fromDisplay(v) : 0; }
  else if (f === 'date') r.date = t.value;
  else if (f === 'category') r.category = t.value;
  _updateFoot();
}

export function saveScan() {
  const today = todayISO();
  const sel = _rows.filter(r => r.selected);
  const bad = sel.find(r => !(r.amountEUR > 0) || !r.description.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(r.date) || r.date > today);
  if (bad) {
    const el = document.querySelector(`.scan-row[data-i="${_rows.indexOf(bad)}"]`);
    el?.classList.add('invalid');
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => el?.classList.remove('invalid'), 1600);
    showSuccessToast('Une ligne est incomplète : montant, description et date sont nécessaires');
    return;
  }
  if (!sel.length) return;

  const curCode = getActiveCurrency().code;
  const toTx = r => ({
    id: uid(), description: r.description.trim(), category: r.category, amountEUR: r.amountEUR,
    date: r.date, type: r.type, curCode,
  });
  const [cY, cM] = _getYM();
  const groups = groupByMonth(sel);
  const otherMonths = [];
  try {
    for (const g of Object.values(groups)) {
      const txs = g.rows.map(toTx);
      if (g.Y === cY && g.M === cM) {
        store.set('mfx_transactions', [...txs, ...(store.get('mfx_transactions') || [])]);
        bridgeSave(cY, cM);
      } else {
        appendToMonth(g.Y, g.M, txs);
        otherMonths.push(`${MONTHS[g.M].toLowerCase()} ${g.Y !== cY ? g.Y : ''}`.trim());
      }
    }
  } catch (e) {
    showSuccessToast('Stockage plein : exporte tes données puis supprime d\'anciens mois');
    return;
  }

  window.closeScreen?.();
  window.goTab?.('tracker');
  // Tout est dans un seul autre mois (ex. relevé du mois dernier) : on l'affiche directement.
  const keys = Object.values(groups);
  if (keys.length === 1 && (keys[0].Y !== cY || keys[0].M !== cM)) {
    window.changeMonth?.((keys[0].Y - cY) * 12 + (keys[0].M - cM));
  }
  const n = sel.length;
  showSuccessToast(`${n} opération${n > 1 ? 's ajoutées' : ' ajoutée'}${otherMonths.length && keys.length === 1 ? ` en ${otherMonths[0]}` : otherMonths.length ? `, dont certaines en ${otherMonths.join(', ')}` : ''}`);
}

export function initScanUI(getYM) {
  if (getYM) _getYM = getYM;
  window.openScanScreen = openScanScreen;
  window.saveScan = saveScan;
  window.retryScan = () => {
    // Vider les champs : sinon choisir à nouveau le même fichier ne déclenche rien
    ['scan-in-camera', 'scan-in-image', 'scan-in-pdf'].forEach(id => { const i = $(id); if (i) i.value = ''; });
    _state('pick');
  };

  ['scan-in-camera', 'scan-in-image', 'scan-in-pdf'].forEach(id => {
    $(id)?.addEventListener('change', e => _onFiles(e.target.files));
  });
  const list = $('scan-list');
  list?.addEventListener('input', _onListInput);
  list?.addEventListener('change', _onListInput);
}
