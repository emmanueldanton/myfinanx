// ═══ Tutorial — 6-slide first-launch walkthrough ═══

const TUTO_KEY   = 'myfinanx-tuto-done';
const TUTO_TOTAL = 6;

const SLIDES = [
  {
    ico:   '💰',
    title: 'Bienvenue sur MyFinanx !',
    body:  'Ton assistant de gestion financière personnelle. Suis tes revenus, dépenses et objectifs d\'épargne en un seul endroit.',
  },
  {
    ico:   '📊',
    title: 'Vue d\'ensemble',
    body:  'Le tableau de bord affiche tes KPIs clés, un graphique de répartition, et les dernières transactions pour avoir tout en un coup d\'œil.',
  },
  {
    ico:   '💼',
    title: 'Budget mensuel',
    body:  'Saisis tes sources de revenus et alloue un budget par poste. L\'app copie automatiquement le budget du mois précédent.',
  },
  {
    ico:   '🧾',
    title: 'Suivi des dépenses',
    body:  'Ajoute tes transactions avec description, catégorie et montant. Filtre l\'historique et visualise la répartition par catégorie.',
  },
  {
    ico:   '🎯',
    title: 'Objectifs d\'épargne',
    body:  'Crée des objectifs (vacances, achat, urgence…) et alimente-les directement depuis leurs cartes. La progression est en temps réel.',
  },
  {
    ico:   '🤖',
    title: 'Conseiller IA',
    body:  'Pose toutes tes questions financières à l\'IA — elle connaît ta situation complète (revenus, budget, dépenses, objectifs).',
  },
];

let _idx = 0;

export function openTuto(startIdx = 0) {
  _idx = Math.max(0, Math.min(startIdx, TUTO_TOTAL - 1));
  const overlay = document.getElementById('tuto-overlay');
  if (!overlay) return;
  overlay.classList.add('open');
  _tutoRender();
  document.addEventListener('keydown', _tutoKey);
}

export function closeTuto() {
  const overlay = document.getElementById('tuto-overlay');
  if (overlay) overlay.classList.remove('open');
  document.removeEventListener('keydown', _tutoKey);
  try { localStorage.setItem(TUTO_KEY, '1'); } catch (e) {}
}

export function tutoNext() {
  if (_idx < TUTO_TOTAL - 1) {
    _idx++;
    _tutoRender();
  } else {
    if (typeof window.launchConfetti === 'function') window.launchConfetti();
    closeTuto();
  }
}

export function tutoGo(idx) {
  _idx = Math.max(0, Math.min(idx, TUTO_TOTAL - 1));
  _tutoRender();
}

export function tutoBackdrop(e) {
  if (e.target === e.currentTarget) closeTuto();
}

export function maybeShowTuto() {
  if (localStorage.getItem(TUTO_KEY)) return;
  setTimeout(openTuto, 600);
}

function _tutoRender() {
  const slide = SLIDES[_idx];
  if (!slide) return;

  // CSS progress bar — set width as percentage
  const progEl = document.getElementById('tuto-prog');
  if (progEl) progEl.style.width = ((_idx + 1) / TUTO_TOTAL * 100) + '%';

  // Slide content
  const icoEl   = document.getElementById('tuto-ico');
  const titleEl = document.getElementById('tuto-title');
  const bodyEl  = document.getElementById('tuto-body');
  if (icoEl)   icoEl.textContent   = slide.ico;
  if (titleEl) titleEl.textContent = slide.title;
  if (bodyEl)  bodyEl.textContent  = slide.body;

  // Dots
  const dotsEl = document.getElementById('tuto-dots');
  if (dotsEl) {
    dotsEl.innerHTML = Array.from({ length: TUTO_TOTAL }, (_, i) =>
      `<button class="tuto-dot${i === _idx ? ' active' : ''}" onclick="tutoGo(${i})" aria-label="Slide ${i + 1}"></button>`
    ).join('');
  }

  // Buttons
  const skipEl = document.getElementById('tuto-skip');
  const nextEl = document.getElementById('tuto-next');
  const isLast = _idx === TUTO_TOTAL - 1;

  if (skipEl) skipEl.style.visibility = isLast ? 'hidden' : 'visible';
  if (nextEl) {
    nextEl.textContent = isLast ? "C'est parti !" : 'Suivant →';
    nextEl.classList.toggle('final', isLast);
  }
}

function _tutoKey(e) {
  if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); tutoNext(); }
  if (e.key === 'ArrowLeft')  { e.preventDefault(); tutoGo(_idx - 1); }
  if (e.key === 'Escape')     { e.preventDefault(); closeTuto(); }
}

// Expose on window for onclick handlers in HTML
export function initTutorial() {
  window.openTuto      = openTuto;
  window.closeTuto     = closeTuto;
  window.tutoNext      = tutoNext;
  window.tutoGo        = tutoGo;
  window.tutoBackdrop  = tutoBackdrop;
  window.maybeShowTuto = maybeShowTuto;
}
