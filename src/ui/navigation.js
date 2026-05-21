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
  document.getElementById('plus-panel')?.classList.remove('open');
  document.getElementById('plus-overlay')?.classList.remove('open');
  document.body.style.overflow = '';
  goTab(id);
}

export function syncBnavActive(id) {
  document.querySelectorAll('.bnav-btn').forEach(b => b.classList.remove('active'));
  const navId = id === 'ai' ? 'plus' : id;
  document.getElementById('bn-' + navId)?.classList.add('active');
}

export function openPlusPanel() {
  document.getElementById('plus-overlay')?.classList.add('open');
  document.getElementById('plus-panel')?.classList.add('open');
  document.body.style.overflow = 'hidden';
  document.querySelectorAll('.bnav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('bn-plus')?.classList.add('active');
}

export function closePlusPanel() {
  document.getElementById('plus-overlay')?.classList.remove('open');
  document.getElementById('plus-panel')?.classList.remove('open');
  document.body.style.overflow = '';
  const activePage = document.querySelector('.page.active');
  if (activePage) syncBnavActive(activePage.id.replace('page-', ''));
}

export function initNavigation() {
  // Expose on window so existing onclick="goTab(...)" handlers continue to work
  window.goTab       = goTab;
  window.goTabMobile = goTabMobile;
  window.syncBnavActive = syncBnavActive;
  window.openPlusPanel  = openPlusPanel;
  window.closePlusPanel = closePlusPanel;
}
