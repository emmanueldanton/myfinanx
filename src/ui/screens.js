// ═══ Screens — sous-écrans plein écran (configuration / édition), style « vraie app » ═══
// Un seul écran ouvert à la fois. Ouverture/fermeture par simple bascule de classe
// (animation minimale, cf. demande de stabilité). Retour via en-tête ou touche Échap.

import { getActiveCurrency } from '../currency.js';

const USER_KEY = 'monargent-username';

const THEME_LABELS = { light: 'Clair', blue: 'Bleu nuit', violet: 'Violet' };

export function openScreen(id) {
  const scr = document.getElementById(id);
  if (!scr) return;
  document.querySelectorAll('.screen.open').forEach(s => {
    s.classList.remove('open');
    s.setAttribute('aria-hidden', 'true');
  });
  scr.classList.add('open');
  scr.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  if (id === 'screen-settings') syncSettings();
  scr.querySelector('.screen-body')?.scrollTo?.(0, 0);
}

export function closeScreen() {
  const open = document.querySelector('.screen.open');
  if (!open) return;
  open.classList.remove('open');
  open.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

// ── Ligne dépliable (Thème, Devise) — une seule ouverte à la fois dans son groupe ──
export function toggleSetRow(row) {
  const wasOpen = row.classList.contains('open');
  const group = row.closest('.set-group');
  group?.querySelectorAll('.set-row.open').forEach(r => {
    r.classList.remove('open');
    r.nextElementSibling?.classList.remove('open');
  });
  if (!wasOpen) {
    row.classList.add('open');
    row.nextElementSibling?.classList.add('open');
  }
}

// ── Réglages : refléter l'état courant (profil, thème, devise) ──
export function syncSettings() {
  const name = localStorage.getItem(USER_KEY) || '';
  const disp = document.getElementById('set-name-display');
  if (disp) disp.textContent = name || 'Ton prénom';
  const av = document.getElementById('set-avatar');
  if (av) av.textContent = (name || 'M').trim().charAt(0).toUpperCase();

  const theme = document.documentElement.getAttribute('data-theme') || 'light';
  const tval = document.getElementById('set-theme-val');
  if (tval) tval.textContent = THEME_LABELS[theme] || 'Clair';

  const cur = getActiveCurrency();
  const cval = document.getElementById('set-cur-val');
  if (cval) cval.textContent = `${cur.code} ${cur.symbol}`;
  document.querySelectorAll('.set-cur-btn').forEach(b => b.classList.toggle('on', b.dataset.cur === cur.code));
}

// ── Renommage inline du profil ──
export function editSettingsName() {
  const disp = document.getElementById('set-name-display');
  if (!disp || disp.querySelector('input')) return;
  const cur = localStorage.getItem(USER_KEY) || '';
  const input = document.createElement('input');
  input.className = 'set-name-input';
  input.value = cur;
  input.maxLength = 30;
  input.placeholder = 'Ton prénom';
  const save = () => { saveAccountName(input.value); syncSettings(); };
  input.addEventListener('blur', save);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') input.blur();
    if (e.key === 'Escape') syncSettings();
  });
  input.addEventListener('click', e => e.stopPropagation());
  disp.textContent = '';
  disp.appendChild(input);
  input.focus(); input.select();
}

export function saveAccountName(v) {
  const name = (v || '').trim();
  try {
    if (name) localStorage.setItem(USER_KEY, name);
    else      localStorage.removeItem(USER_KEY);
  } catch (e) {}
  window.renderGreeting?.();
}

export function initScreens() {
  window.openScreen      = openScreen;
  window.closeScreen     = closeScreen;
  window.syncSettings    = syncSettings;
  window.toggleSetRow    = toggleSetRow;
  window.editSettingsName = editSettingsName;
  window.saveAccountName = saveAccountName;
  // Échap ferme l'écran courant
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeScreen(); });
}
