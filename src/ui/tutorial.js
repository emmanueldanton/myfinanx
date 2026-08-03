// ═══ Tutorial — parcours plein écran (5 écrans, aperçus maquettés) ═══
import iconSrc from '../../icon.png';
import { openOverlay, closeOverlay } from './overlay.js';

const TUTO_KEY   = 'myfinanx-tuto-done';

// Chaque écran : couleur d'accent, aperçu maquetté (mini rendu de l'écran réel), titre, texte.
const SLIDES = [
  {
    accent: 'var(--pr)',
    mock: `
      <div class="tm-welcome">
        <img src="${iconSrc}" class="tm-logo" alt="MyFinanx">
        <div class="tm-hero">
          <div class="tm-hero-lbl">Reste disponible</div>
          <div class="tm-hero-val">1 095 €</div>
        </div>
      </div>`,
    title: 'Bienvenue sur MyFinanx',
    body:  "Ton appli de <strong>gestion d'argent</strong>, simple et complète. Gratuite, privée, et installable sur ton téléphone comme une vraie app.",
  },
  {
    accent: '#12A971',
    mock: `
      <div class="tm-panel">
        <div class="tm-rev"><span>Revenus</span><strong>2 400 €</strong></div>
        <div class="tm-brow"><span class="tm-dot" style="background:#4D78D4"></span><span class="tm-bname">Logement</span><span class="tm-bval">900 €</span></div>
        <div class="tm-bar"><i style="width:75%;background:#4D78D4"></i></div>
        <div class="tm-brow"><span class="tm-dot" style="background:#e87a7a"></span><span class="tm-bname">Alimentation</span><span class="tm-bval">400 €</span></div>
        <div class="tm-bar"><i style="width:42%;background:#e87a7a"></i></div>
      </div>`,
    title: 'Ton budget mensuel',
    body:  "Renseigne tes <strong>revenus</strong> et répartis-les en <strong>postes de dépenses</strong>. MyFinanx recopie ton budget chaque mois pour te faire gagner du temps.",
  },
  {
    accent: '#C43A3A',
    mock: `
      <div class="tm-panel">
        <div class="tm-freqlbl">Fréquents</div>
        <div class="tm-chips">
          <span class="tm-chip">Courses Lidl · 54 €</span>
          <span class="tm-chip">Café · 2,50 €</span>
        </div>
        <div class="tm-field">Courses Lidl</div>
        <div class="tm-catrow"><span class="tm-cat">Alimentation</span><span class="tm-auto">rempli tout seul</span></div>
      </div>`,
    title: 'Tes dépenses en un geste',
    body:  "Ajoute un achat en quelques secondes. L'app te propose tes dépenses fréquentes et <strong>devine la catégorie à partir de tes habitudes</strong>. Tu n'as plus qu'à valider.",
  },
  {
    accent: '#a78bfa',
    mock: `
      <div class="tm-panel">
        <div class="tm-goal-top"><span class="tm-goal-name">Voyage</span><span class="tm-goal-pct">60 %</span></div>
        <div class="tm-bar"><i style="width:60%;background:#a78bfa"></i></div>
        <div class="tm-goal-sub">1 200 € sur 2 000 €</div>
      </div>`,
    title: "Tes objectifs d'épargne",
    body:  "Voyage, voiture, fonds d'urgence... Définis tes <strong>objectifs</strong>, alimente-les à ton rythme et suis leur avancement en temps réel.",
  },
  {
    accent: 'var(--ai)',
    mock: `
      <div class="tm-chat">
        <div class="tm-msg bot">Tu as dépensé 62 % de tes revenus ce mois. 👍</div>
        <div class="tm-msg usr">Comment épargner plus ?</div>
      </div>`,
    title: 'Ton conseiller IA',
    body:  "Pose tes questions à un <strong>conseiller financier IA</strong> qui connaît ta situation réelle et te répond simplement, à tout moment.",
  },
];

const TUTO_TOTAL = SLIDES.length;
let _idx = 0;

export function openTuto(startIdx = 0) {
  _idx = Math.max(0, Math.min(startIdx, TUTO_TOTAL - 1));
  openOverlay('tuto-overlay');
  _tutoRender();
  document.addEventListener('keydown', _tutoKey);
}

export function closeTuto() {
  closeOverlay('tuto-overlay');
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

export function maybeShowTuto() {
  // Vérifie aussi la clé monolithe héritée pour ne pas remontrer le tuto aux anciens utilisateurs
  if (localStorage.getItem(TUTO_KEY) || localStorage.getItem('monargent-onboarded')) return;
  setTimeout(openTuto, 600);
}

function _tutoRender() {
  const slide = SLIDES[_idx];
  if (!slide) return;

  const overlay = document.getElementById('tuto-overlay');
  if (overlay) overlay.style.setProperty('--tut-accent', slide.accent);

  const progEl = document.getElementById('tuto-prog');
  if (progEl) progEl.style.width = ((_idx + 1) / TUTO_TOTAL * 100) + '%';

  const mockEl  = document.getElementById('tuto-ico');
  const titleEl = document.getElementById('tuto-title');
  const bodyEl  = document.getElementById('tuto-body');
  if (mockEl)  mockEl.innerHTML   = slide.mock;
  if (titleEl) titleEl.textContent = slide.title;
  if (bodyEl)  bodyEl.innerHTML   = slide.body;

  const dotsEl = document.getElementById('tuto-dots');
  if (dotsEl) {
    dotsEl.innerHTML = Array.from({ length: TUTO_TOTAL }, (_, i) =>
      `<button class="tut-dot${i === _idx ? ' active' : ''}" onclick="tutoGo(${i})" aria-label="Écran ${i + 1}"></button>`
    ).join('');
  }

  const skipEl = document.getElementById('tuto-skip');
  const nextEl = document.getElementById('tuto-next');
  const isLast = _idx === TUTO_TOTAL - 1;
  if (skipEl) skipEl.style.visibility = isLast ? 'hidden' : 'visible';
  if (nextEl) {
    nextEl.textContent = isLast ? "C'est parti !" : 'Suivant';
    nextEl.classList.toggle('final', isLast);
  }
}

function _tutoKey(e) {
  if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); tutoNext(); }
  if (e.key === 'ArrowLeft')  { e.preventDefault(); tutoGo(_idx - 1); }
  if (e.key === 'Escape')     { e.preventDefault(); closeTuto(); }
}

// Expose sur window pour les onclick du HTML
export function initTutorial() {
  window.openTuto      = openTuto;
  window.closeTuto     = closeTuto;
  window.tutoNext      = tutoNext;
  window.tutoGo        = tutoGo;
  window.maybeShowTuto = maybeShowTuto;
}
