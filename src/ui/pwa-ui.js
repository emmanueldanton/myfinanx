// ═══ PWA UI — invite d'installation (mobile uniquement) ═══

const PWA_DISMISSED_KEY = 'mfx-pwa-popup-dismissed';
const PWA_COOLDOWN_MS   = 7 * 24 * 60 * 60 * 1000; // 7 jours

// ── Init ──────────────────────────────────────────────────────────

export function initPwaUI() {
  window.closePwaPopup   = closePwaPopup;
  window.pwaOverlayClick = pwaOverlayClick;
  window.pwaTab          = pwaTab;
}

// ── Show ──────────────────────────────────────────────────────────

export function showPwaPopup() {
  // Ne pas afficher si déjà installée en standalone
  if (window.matchMedia('(display-mode: standalone)').matches) return;
  if (navigator.standalone === true) return;

  // Uniquement sur appareils tactiles — jamais sur desktop Chrome (FR-038)
  if (!window.matchMedia('(pointer: coarse)').matches) return;

  // Cooldown 7 jours
  const dismissed = parseInt(localStorage.getItem(PWA_DISMISSED_KEY) || '0', 10);
  if (dismissed && (Date.now() - dismissed) < PWA_COOLDOWN_MS) return;

  // Pré-sélectionner l'onglet Android si pertinent
  const isAndroid = /android/i.test(navigator.userAgent);
  if (isAndroid) pwaTab('android');

  setTimeout(() => {
    document.getElementById('pwa-overlay')?.classList.add('open');
    document.body.style.overflow = 'hidden';
  }, 800);
}

// ── Close ─────────────────────────────────────────────────────────

export function closePwaPopup() {
  document.getElementById('pwa-overlay')?.classList.remove('open');
  document.body.style.overflow = '';
  try { localStorage.setItem(PWA_DISMISSED_KEY, String(Date.now())); } catch (e) {}
}

export function pwaOverlayClick(e) {
  if (e.target === document.getElementById('pwa-overlay')) closePwaPopup();
}

export function pwaTab(os) {
  document.getElementById('pwa-ios')?.classList.toggle('on', os === 'ios');
  document.getElementById('pwa-android')?.classList.toggle('on', os === 'android');
  document.getElementById('pwa-tab-ios')?.classList.toggle('on', os === 'ios');
  document.getElementById('pwa-tab-android')?.classList.toggle('on', os === 'android');
}
