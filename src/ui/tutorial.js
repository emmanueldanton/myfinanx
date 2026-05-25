// ═══ Tutorial — 6-slide first-launch walkthrough (bottom sheet) ═══
import iconSrc from '../../icon.png';

const TUTO_KEY   = 'myfinanx-tuto-done';
const TUTO_TOTAL = 6;

// Minimalist stroke SVGs — currentColor inherits --pr-l from .tuto-ico
const _ico = (paths) =>
  `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.7"
       stroke-linecap="round" stroke-linejoin="round" width="34" height="34" aria-hidden="true">${paths}</svg>`;

const SLIDES = [
  {
    ico: `<img src="${iconSrc}" width="44" height="44" style="border-radius:14px;display:block;" alt="MyFinanx">`,
    title: 'Bienvenue sur MyFinanx !',
    body:  "MyFinanx, c'est ton appli de <strong>gestion d'argent</strong> simple et complète. Gratuite, privée, et disponible sur ton téléphone comme une vraie app.",
  },
  {
    ico: _ico(`
      <rect x="4"  y="4"  width="14" height="14" rx="3.5" fill="currentColor" fill-opacity=".22"/>
      <rect x="22" y="4"  width="14" height="14" rx="3.5" fill="currentColor" fill-opacity=".12"/>
      <rect x="4"  y="22" width="14" height="14" rx="3.5" fill="currentColor" fill-opacity=".12"/>
      <rect x="22" y="22" width="14" height="14" rx="3.5" fill="currentColor" fill-opacity=".2"/>
    `),
    title: "Tout en un coup d'oeil",
    body:  "Consulte en un instant <strong>ce que tu gagnes</strong>, <strong>ce que tu dépenses</strong> et ce qu'il te reste. Tout est calculé automatiquement, sans effort.",
  },
  {
    ico: _ico(`
      <rect x="4" y="12" width="32" height="22" rx="4" fill="currentColor" fill-opacity=".1"/>
      <path d="M4 19h32"/>
      <path d="M10 12V9a2 2 0 0 1 2-2h14"/>
      <rect x="26" y="22" width="8" height="7" rx="3.5" fill="currentColor" fill-opacity=".25" stroke-width="1.4"/>
    `),
    title: 'Budget mensuel',
    body:  "Renseigne tes <strong>sources de revenus</strong> et répartis ton argent en <strong>postes de dépenses</strong>. MyFinanx recopie ton budget chaque mois pour te faire gagner du temps.",
  },
  {
    ico: _ico(`
      <path d="M10 4h20v30l-3.5-2.5L23 34l-3-2.5L17 34l-3.5-2.5L10 34z"
            fill="currentColor" fill-opacity=".1"/>
      <line x1="16" y1="14" x2="24" y2="14"/>
      <line x1="16" y1="20" x2="24" y2="20"/>
      <line x1="16" y1="26" x2="21" y2="26"/>
    `),
    title: 'Suivi des dépenses',
    body:  "Enregistre chaque <strong>achat ou dépense</strong> en quelques secondes. Catégorise-les et vois facilement où part ton argent, mois par mois.",
  },
  {
    ico: _ico(`
      <circle cx="20" cy="20" r="16" fill="currentColor" fill-opacity=".06"/>
      <circle cx="20" cy="20" r="10" fill="currentColor" fill-opacity=".12"/>
      <circle cx="20" cy="20" r="4"  fill="currentColor" fill-opacity=".28"/>
      <circle cx="20" cy="20" r="1.5" fill="currentColor" stroke="none"/>
    `),
    title: "Objectifs d'épargne",
    body:  "Définis tes <strong>objectifs d'épargne</strong> : voyage, voiture, fonds d'urgence... Alimente-les à ton rythme et suis leur avancement en temps réel.",
  },
  {
    ico: _ico(`
      <path d="M7 7h26a4 4 0 0 1 4 4v14a4 4 0 0 1-4 4H22l-7 6v-6H7a4 4 0 0 1-4-4V11a4 4 0 0 1 4-4z"
            fill="currentColor" fill-opacity=".12"/>
      <circle cx="14" cy="18" r="2.2" fill="currentColor" stroke="none"/>
      <circle cx="20" cy="18" r="2.2" fill="currentColor" stroke="none"/>
      <circle cx="26" cy="18" r="2.2" fill="currentColor" stroke="none" opacity=".4"/>
    `),
    title: 'Conseiller IA',
    body:  "Pose tes questions à ton <strong>conseiller financier IA</strong>. Il connaît ta situation et te donne des conseils adaptés, disponible à tout moment.",
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
    // Demande push après la fin du tuto (délai pour laisser le confetti s'afficher)
    setTimeout(() => window.requestPushPermission?.(), 1500);
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
  // Also check the legacy monolith key so returning users don't see the tutorial again
  if (localStorage.getItem(TUTO_KEY) || localStorage.getItem('monargent-onboarded')) return;
  setTimeout(openTuto, 600);
}

function _tutoRender() {
  const slide = SLIDES[_idx];
  if (!slide) return;

  // CSS progress bar
  const progEl = document.getElementById('tuto-prog');
  if (progEl) progEl.style.width = ((_idx + 1) / TUTO_TOTAL * 100) + '%';

  // Slide content — innerHTML for SVG icon
  const icoEl   = document.getElementById('tuto-ico');
  const titleEl = document.getElementById('tuto-title');
  const bodyEl  = document.getElementById('tuto-body');
  if (icoEl)   icoEl.innerHTML    = slide.ico;
  if (titleEl) titleEl.textContent = slide.title;
  if (bodyEl)  bodyEl.innerHTML   = slide.body;

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
