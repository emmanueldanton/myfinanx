// ═══ PWA UI — invite d'installation (mobile uniquement) ═══

const PWA_DISMISSED_KEY = 'mfx-pwa-popup-dismissed';
const PWA_COOLDOWN_MS   = 7 * 24 * 60 * 60 * 1000; // 7 jours

// Guard session : on ne montre la demande push qu'une fois par ouverture d'app
let _pushShownThisSession = false;

// ── Init ──────────────────────────────────────────────────────────

export function initPwaUI() {
  window.closePwaPopup         = closePwaPopup;
  window.pwaOverlayClick       = pwaOverlayClick;
  window.pwaTab                = pwaTab;
  window.closePushOverlay      = closePushOverlay;
  window.pushOverlayBackdrop   = pushOverlayBackdrop;
  window.confirmPushPermission = confirmPushPermission;
  window.requestPushPermission = requestPushPermission;
}

// ── Show install popup ────────────────────────────────────────────

export function showPwaPopup() {
  if (_isStandalone()) return; // App installée — pas de popup install

  // Uniquement sur appareils tactiles — jamais sur desktop Chrome (FR-038)
  if (!window.matchMedia('(pointer: coarse)').matches) return;

  // Cooldown 7 jours
  const dismissed = parseInt(localStorage.getItem(PWA_DISMISSED_KEY) || '0', 10);
  if (dismissed && (Date.now() - dismissed) < PWA_COOLDOWN_MS) return;

  const isAndroid = /android/i.test(navigator.userAgent);
  if (isAndroid) pwaTab('android');

  setTimeout(() => {
    document.getElementById('pwa-overlay')?.classList.add('open');
    document.body.style.overflow = 'hidden';
  }, 800);
}

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

// ── Push permission overlay ───────────────────────────────────────

export function requestPushPermission() {
  // Une seule fois par session (rechargement de page)
  if (_pushShownThisSession) return;

  // Uniquement si l'app est installée en standalone sur mobile
  if (!_isStandalone()) return;

  // Uniquement si le tutoriel a été complété
  if (!_tutoDone()) return;

  // Pas de prompt si déjà accordé ou refusé
  if (typeof Notification !== 'undefined' && Notification.permission !== 'default') return;

  _pushShownThisSession = true;
  const overlay = document.getElementById('push-overlay');
  if (overlay) { overlay.classList.add('open'); document.body.style.overflow = 'hidden'; }
}

export function closePushOverlay() {
  document.getElementById('push-overlay')?.classList.remove('open');
  document.body.style.overflow = '';
}

export function pushOverlayBackdrop(e) {
  if (e.target === document.getElementById('push-overlay')) closePushOverlay();
}

export function confirmPushPermission() {
  closePushOverlay();
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(function(OneSignal) {
    OneSignal.Notifications.requestPermission();
  });
}

// ── Helpers ───────────────────────────────────────────────────────

function _isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
      || navigator.standalone === true;
}

function _tutoDone() {
  return !!(localStorage.getItem('myfinanx-tuto-done')
         || localStorage.getItem('monargent-onboarded'));
}
