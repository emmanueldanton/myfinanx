// ═══ PWA UI — invite d'installation (mobile uniquement) ═══
import { openOverlay, closeOverlay } from './overlay.js';

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
  if (_isStandalone()) return;

  if (!window.matchMedia('(pointer: coarse)').matches) return;

  const dismissed = parseInt(localStorage.getItem(PWA_DISMISSED_KEY) || '0', 10);
  if (dismissed && (Date.now() - dismissed) < PWA_COOLDOWN_MS) return;

  const isAndroid = /android/i.test(navigator.userAgent);
  if (isAndroid) pwaTab('android');

  setTimeout(() => openOverlay('pwa-overlay'), 800);
}

export function closePwaPopup() {
  closeOverlay('pwa-overlay');
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
  if (_pushShownThisSession) return;
  if (!_isStandalone()) return;
  if (!_tutoDone()) return;
  if (typeof Notification !== 'undefined' && Notification.permission !== 'default') return;

  _pushShownThisSession = true;
  openOverlay('push-overlay');
}

export function closePushOverlay() {
  closeOverlay('push-overlay');
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
