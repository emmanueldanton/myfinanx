// ═══ Screens — sous-écrans plein écran (configuration / édition), style « vraie app » ═══
// Un seul écran ouvert à la fois. Ouverture/fermeture par simple bascule de classe
// (animation minimale, cf. demande de stabilité). Retour via en-tête ou touche Échap.

const USER_KEY = 'monargent-username';

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

// ── Réglages : refléter l'état courant (prénom, devise ; le thème est géré par syncThemeDots) ──
export function syncSettings() {
  const inp = document.getElementById('set-name');
  if (inp) inp.value = localStorage.getItem(USER_KEY) || '';
  const cur = localStorage.getItem('monargent-cur') || 'EUR';
  document.querySelectorAll('.set-cur-btn').forEach(b => b.classList.toggle('on', b.dataset.cur === cur));
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
  window.openScreen     = openScreen;
  window.closeScreen    = closeScreen;
  window.syncSettings   = syncSettings;
  window.saveAccountName = saveAccountName;
  // Échap ferme l'écran courant
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeScreen(); });
}
