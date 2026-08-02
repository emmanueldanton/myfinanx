// ═══ Screens — sous-écrans plein écran (configuration / édition), style « vraie app » ═══
// Un seul écran ouvert à la fois. Ouverture/fermeture par simple bascule de classe
// (animation minimale, cf. demande de stabilité). Retour via en-tête ou touche Échap.

import { getActiveCurrency } from '../currency.js';

const USER_KEY   = 'monargent-username';
const GENDER_KEY = 'monargent-usergender';

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
  document.querySelectorAll('.screen-menu.open').forEach(m => m.classList.remove('open'));
  open.classList.remove('open');
  open.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

// ── Menu « … » (options) dans l'en-tête d'un écran de détail ──
export function toggleScreenMenu(btn) {
  const menu = btn.nextElementSibling;
  if (!menu) return;
  const willOpen = !menu.classList.contains('open');
  document.querySelectorAll('.screen-menu.open').forEach(m => m.classList.remove('open'));
  menu.classList.toggle('open', willOpen);
  if (willOpen) {
    setTimeout(() => {
      const off = (e) => {
        if (!menu.parentElement.contains(e.target)) {
          menu.classList.remove('open');
          document.removeEventListener('click', off);
        }
      };
      document.addEventListener('click', off);
    }, 0);
  }
}

// Ferme tout menu ouvert (appelé avant une action de menu)
export function closeScreenMenus() {
  document.querySelectorAll('.screen-menu.open').forEach(m => m.classList.remove('open'));
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

// ── Écran Profil (détails utilisateur : prénom + sexe) ──
export function openProfile() {
  syncProfile();
  openScreen('screen-profile');
  setTimeout(() => document.getElementById('prof-name')?.focus(), 60);
}

export function syncProfile() {
  const name = localStorage.getItem(USER_KEY) || '';
  const inp = document.getElementById('prof-name');
  if (inp) inp.value = name;
  const av = document.getElementById('prof-avatar');
  if (av) av.textContent = (name || 'M').trim().charAt(0).toUpperCase();
  const g = localStorage.getItem(GENDER_KEY) || '';
  document.querySelectorAll('#prof-sex .prof-sex-btn').forEach(b => b.classList.toggle('on', b.dataset.g === g));
}

export function saveProfileName(v) {
  const name = (v || '').trim();
  try {
    if (name) localStorage.setItem(USER_KEY, name);
    else      localStorage.removeItem(USER_KEY);
  } catch (e) {}
  const av = document.getElementById('prof-avatar');
  if (av) av.textContent = (name || 'M').charAt(0).toUpperCase();
  window.renderGreeting?.();
  syncSettings();
}

export function setProfileGender(g) {
  try { localStorage.setItem(GENDER_KEY, g); } catch (e) {}
  document.querySelectorAll('#prof-sex .prof-sex-btn').forEach(b => b.classList.toggle('on', b.dataset.g === g));
  window.renderGreeting?.();
}

export function initScreens() {
  window.openScreen      = openScreen;
  window.closeScreen     = closeScreen;
  window.toggleScreenMenu = toggleScreenMenu;
  window.closeScreenMenus = closeScreenMenus;
  window.syncSettings    = syncSettings;
  window.toggleSetRow    = toggleSetRow;
  window.openProfile       = openProfile;
  window.saveProfileName   = saveProfileName;
  window.setProfileGender  = setProfileGender;
  // Échap ferme l'écran courant
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeScreen(); });
}
