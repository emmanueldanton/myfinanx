// ═══ Overlay manager — un seul panneau ouvert à la fois, scroll iOS-safe ═══

let _current = null;
let _scrollY = 0;

export function openOverlay(id) {
  if (_current && _current !== id) _close(_current);

  const el = document.getElementById(id);
  if (!el) return;

  _current = id;
  el.classList.add('open');
  _lockScroll();
}

export function closeOverlay(id) {
  _close(id);
}

function _close(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
  if (_current === id) {
    _current = null;
    _unlockScroll();
  }
}

// position:fixed est la seule méthode fiable sur iOS Safari
function _lockScroll() {
  _scrollY = window.scrollY;
  document.body.style.overflow = 'hidden';
  document.body.style.position = 'fixed';
  document.body.style.top      = `-${_scrollY}px`;
  document.body.style.width    = '100%';
}

function _unlockScroll() {
  document.body.style.overflow = '';
  document.body.style.position = '';
  document.body.style.top      = '';
  document.body.style.width    = '';
  window.scrollTo(0, _scrollY);
}
