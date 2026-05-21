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
import { renderAll, subscribeAll, initDashboard } from './ui/index.js';
import { bridgeLoad, bridgeLoadGoals, bridgeSave, bridgeLoadPrefs } from './data-bridge.js';
import { initNavigation } from './ui/navigation.js';
import './styles/tutorial.css';
import { initTutorial, maybeShowTuto } from './ui/tutorial.js';

// ═══ Active month state ═══
let _Y, _M;

// Exposed on window so monolith's onclick="changeMonth(d)" continues to work
function changeMonth(delta) {
  const now  = new Date();
  const newM = _M + delta;
  const newY = newM < 0 ? _Y - 1 : newM > 11 ? _Y + 1 : _Y;
  const adjM = ((newM % 12) + 12) % 12;
  // Block future months
  if (newY > now.getFullYear() || (newY === now.getFullYear() && adjM > now.getMonth())) return;
  _M = adjM; _Y = newY;
  bridgeLoad(_Y, _M);
  // Goals are NOT reloaded on month change (FR-007 — independent lifecycle)
  _notifyAll();
}

function _notifyAll() {
  const month = `${_Y}-${String(_M + 1).padStart(2, '0')}`;
  renderAll({
    budget:       store.get('mfx_budget'),
    transactions: store.get('mfx_transactions') || [],
    goals:        store.get('mfx_goals') || [],
    month,
    year: _Y,
  });
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

  // Visual preferences — avoid theme flash
  loadTheme();

  // Breakpoint tracking for layout-aware components
  initBreakpointManager();

  // Apply saved currency to module layer
  const prefs = bridgeLoadPrefs();
  setActiveCurrency(prefs.currency);

  // Live exchange rates (async, non-blocking)
  fetchLiveRates().catch(() => {});

  // Active month = current month
  const now = new Date();
  _Y = now.getFullYear();
  _M = now.getMonth();

  // Load month data (revenues + budget + transactions) from monolith localStorage
  bridgeLoad(_Y, _M);

  // Load goals ONCE — never reloaded on month navigation
  bridgeLoadGoals();

  // Wire navigation module (exposes goTab etc. on window)
  initNavigation();

  // Wire tutorial module (exposes openTuto etc. on window)
  initTutorial();

  // Expose changeMonth on window for monolith onclick handlers
  window.changeMonth = changeMonth;

  // Init donut ResizeObserver
  initDashboard();

  // Subscribe to store changes → re-render
  subscribeAll(() => _notifyAll());

  // Initial render
  _notifyAll();

  // Show tutorial on first launch (600ms delay)
  maybeShowTuto();
}

// Modules are deferred — monolith's inline init() runs first, then this wires the modular layer
document.addEventListener('DOMContentLoaded', init);
