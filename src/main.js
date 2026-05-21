// ═══ CSS — Vite extracts and injects these into the build output ═══
import './styles/main.css';
import './styles/themes.css';
import './styles/components.css';
import './styles/layout-mobile.css';
import './styles/layout-tablet.css';
import './styles/layout-desktop.css';

// ═══ Module imports ═══
import { store } from './store.js';
import { loadTheme } from './theme.js';
import { fetchLiveRates, setActiveCurrency } from './currency.js';
import { renderAll, subscribeAll } from './ui/index.js';

// ═══ Navigation — single source of truth across all breakpoints ═══

let _activeTab = 'ov';

export function goToTab(id) {
  if (_activeTab === id) return;
  _activeTab = id;

  // Sync sidebar (tablet/desktop) and bottom bar (mobile) simultaneously
  document.querySelectorAll('[data-tab]').forEach(el => {
    el.classList.toggle('active', el.dataset.tab === id);
  });

  document.querySelectorAll('.page').forEach(p => {
    p.classList.toggle('active', p.id === 'page-' + id);
  });

  window.scrollTo(0, 0);
}

// ═══ Breakpoint manager — sets data-layout on <html> ═══

function initBreakpointManager() {
  const mobileQ = window.matchMedia('(max-width: 767px)');
  const tabletQ = window.matchMedia('(min-width: 768px) and (max-width: 1199px)');

  function apply() {
    document.documentElement.dataset.layout =
      mobileQ.matches ? 'mobile' : tabletQ.matches ? 'tablet' : 'desktop';
  }

  mobileQ.addEventListener('change', apply);
  tabletQ.addEventListener('change', apply);
  apply();
}

// ═══ Init ═══

function init() {
  // Schema migration (safe, idempotent)
  store.migrate();

  // Visual preferences — avoid theme flash on subsequent loads
  loadTheme();

  // Breakpoint tracking for layout-aware components
  initBreakpointManager();

  // Apply saved currency to module layer
  const savedCur = localStorage.getItem('monargent-cur') || 'EUR';
  setActiveCurrency(savedCur);

  // Live exchange rates (async, non-blocking)
  fetchLiveRates().catch(() => {});

  // Subscribe to modular store → re-render UI components
  // Fires when mfx_budget / mfx_transactions / mfx_goals are updated via store.set()
  subscribeAll(state => {
    const month = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    renderAll({ ...state, month });
  });
}

// Modules are deferred by default — monolith's inline init() runs first,
// then this init wires up the modular layer without conflicting.
document.addEventListener('DOMContentLoaded', init);
