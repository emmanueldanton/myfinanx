// ═══ Navigation — single source of truth, exposed on window for onclick handlers ═══

export function goTab(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  const page = document.getElementById('page-' + id);
  if (page) page.classList.add('active');
  document.querySelectorAll('.tab').forEach(t => {
    const oc = t.getAttribute('onclick');
    if (oc && oc.includes("'" + id + "'")) t.classList.add('active');
  });
  document.querySelectorAll('.drawer-item').forEach(el => {
    el.classList.toggle('active', el.id === 'di-' + id);
  });
  syncBnavActive(id);
  window.scrollTo(0, 0);
}

export function goTabMobile(id) {
  document.body.style.overflow = '';
  goTab(id);
}

export function syncBnavActive(id) {
  document.querySelectorAll('.bnav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('bn-' + id)?.classList.add('active');
  moveBnavPill();
}

// Déplace/morphe l'indicateur "pilule" sous l'onglet actif (transform + width animés en CSS)
export function moveBnavPill() {
  const inner  = document.querySelector('.bnav-inner');
  const pill   = document.getElementById('bnav-pill');
  const active = inner?.querySelector('.bnav-btn.active');
  if (!inner || !pill || !active || active.offsetWidth === 0) return;
  pill.style.width = active.offsetWidth + 'px';
  pill.style.transform = 'translateX(' + active.offsetLeft + 'px)';
}

export function initNavigation() {
  // Expose on window so existing onclick="goTab(...)" handlers continue to work
  window.goTab       = goTab;
  window.goTabMobile = goTabMobile;
  window.syncBnavActive = syncBnavActive;

  // Place la pilule au chargement SANS animation, puis réactive la transition
  const pill = document.getElementById('bnav-pill');
  requestAnimationFrame(() => {
    if (pill) pill.style.transition = 'none';
    moveBnavPill();
    requestAnimationFrame(() => { if (pill) pill.style.transition = ''; });
  });
  // Recalcule en cas de rotation / redimensionnement (desktop ↔ mobile)
  window.addEventListener('resize', moveBnavPill);
}
