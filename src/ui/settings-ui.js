// ═══ Settings UI — devise, thème, drawer ═══
import { setActiveCurrency, getActiveCurrency, CURRENCIES } from '../currency.js';

const USER_KEY   = 'monargent-username';
const GENDER_KEY = 'monargent-usergender';

let _forceRefresh = () => {};

// ── Init ──────────────────────────────────────────────────────────

export function initSettingsUI(forceRefresh) {
  _forceRefresh = forceRefresh;
  window.toggleCurDrop = toggleCurDrop;
  window.setCurrency   = setCurrency;
  window.toggleDrawer  = toggleDrawer;
  window.applyRates    = applyRates;

  // Close currency dropdown on outside click
  document.addEventListener('click', e => {
    if (!e.target.closest('#curPick')) document.getElementById('curPick')?.classList.remove('open');
  });
  // Close drawer on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') toggleDrawer(false);
  });
}

// ── Currency ──────────────────────────────────────────────────────

export function toggleCurDrop() {
  document.getElementById('curPick')?.classList.toggle('open');
}

export function setCurrency(code) {
  setActiveCurrency(code);
  const cur = getActiveCurrency();

  try { localStorage.setItem('monargent-cur', code); } catch (e) {
    if (e.name === 'QuotaExceededError' && window.showStorageError) window.showStorageError();
  }

  // Update button label
  const lbl = document.getElementById('cur-active-lbl');
  if (lbl) lbl.textContent = `${cur.code} ${cur.symbol}`;
  const sym = document.getElementById('cur-active-sym');
  if (sym) sym.textContent = cur.symbol;

  // Update dropdown active state
  document.querySelectorAll('.cur-opt').forEach(el => {
    el.classList.toggle('active', el.dataset.cur === code);
  });

  // Update rate notes
  document.querySelectorAll('[id^="rate-"]').forEach(el => {
    const c = el.id.replace('rate-', '');
    if (c && CURRENCIES[c]) {
      const rc = CURRENCIES[c];
      el.textContent = `≈ ${rc.rate.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ${rc.symbol}`;
    }
  });

  // Close dropdown
  document.getElementById('curPick')?.classList.remove('open');

  // Update transaction form currency symbol
  const txSym = document.getElementById('tx-cur-sym');
  if (txSym) txSym.textContent = cur.symbol;
  const txLbl = document.getElementById('tx-cur-lbl');
  if (txLbl) txLbl.textContent = cur.symbol;

  // Conversion note
  const note = document.getElementById('cur-conv-note');
  const ntxt = document.getElementById('cur-conv-txt');
  if (note && ntxt) {
    if (code !== 'EUR') {
      note.style.display = 'inline-flex';
      ntxt.textContent = `Tous les montants affichés en ${cur.name} (${cur.symbol}) · Taux : 1 EUR ≈ ${cur.rate.toLocaleString('fr-FR', { maximumFractionDigits: 4 })} ${cur.symbol}`;
    } else {
      note.style.display = 'none';
    }
  }

  // Update column headers
  const hdr = `Montant (${cur.symbol})`;
  ['rev-th-cur', 'bud-th-cur'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = hdr;
  });

  // Re-render all with new currency
  _forceRefresh();
}

export function applyRates(rates) {
  ['USD', 'GBP', 'CAD', 'MAD'].forEach(code => {
    if (rates[code] && CURRENCIES[code]) CURRENCIES[code].rate = rates[code];
  });
  // Refresh rate notes in the currency picker
  document.querySelectorAll('[id^="rate-"]').forEach(el => {
    const c = el.id.replace('rate-', '');
    if (c && CURRENCIES[c]) {
      const rc = CURRENCIES[c];
      el.textContent = `≈ ${rc.rate.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ${rc.symbol}`;
    }
  });
}

// ── Drawer ────────────────────────────────────────────────────────

export function toggleDrawer(open) {
  const overlay = document.getElementById('drawer-overlay');
  const drawer  = document.getElementById('drawer');
  if (!overlay || !drawer) return;
  const isOpen = (open !== undefined) ? open : !drawer.classList.contains('open');
  overlay.classList.toggle('open', isOpen);
  drawer.classList.toggle('open', isOpen);
  document.body.style.overflow = isOpen ? 'hidden' : '';
}
