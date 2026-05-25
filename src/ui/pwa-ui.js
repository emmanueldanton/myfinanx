// ═══ PWA UI — invite d'installation (mobile uniquement) ═══

const PWA_DISMISSED_KEY = 'mfx-pwa-popup-dismissed';
const PWA_COOLDOWN_MS   = 7 * 24 * 60 * 60 * 1000; // 7 jours
const PUSH_ASKED_KEY    = 'mfx-push-asked';

// ── Init ──────────────────────────────────────────────────────────

export function initPwaUI() {
  window.closePwaPopup   = closePwaPopup;
  window.pwaOverlayClick = pwaOverlayClick;
  window.pwaTab          = pwaTab;
}

// ── Show ──────────────────────────────────────────────────────────

export function showPwaPopup() {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
                    || navigator.standalone === true;

  // App déjà installée — pas de popup install, mais on peut demander les notifs
  if (isStandalone) {
    setTimeout(requestPushPermission, 2000);
    return;
  }

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
  // Après fermeture du popup install, demander les notifs push
  setTimeout(requestPushPermission, 3000);
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

// ── Push notifications ────────────────────────────────────────────

export function requestPushPermission() {
  // Ne demander qu'une seule fois
  if (localStorage.getItem(PUSH_ASKED_KEY)) return;
  // Pas de prompt si déjà accordé ou refusé
  if (typeof Notification !== 'undefined' && Notification.permission !== 'default') return;

  try { localStorage.setItem(PUSH_ASKED_KEY, '1'); } catch (e) {}

  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(function(OneSignal) {
    OneSignal.Slidedown.promptPush();
  });
}
