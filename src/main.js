// ═══ CSS — Vite extracts and injects these into the build output ═══
import './styles/main.css';
import './styles/themes.css';
import './styles/components.css';
import './styles/layout-mobile.css';
import './styles/layout-tablet.css';
import './styles/layout-desktop.css';

// ═══ Module imports ═══
import { store } from './store.js';
import { loadTheme, setTheme } from './theme.js';
import { fetchLiveRates, setActiveCurrency } from './currency.js';
import { renderAll, initDashboard } from './ui/index.js';
import { bridgeLoad, bridgeLoadGoals, bridgeSave, bridgeLoadPrefs } from './data-bridge.js';
import { initNavigation } from './ui/navigation.js';
import './styles/tutorial.css';
import { initTutorial, maybeShowTuto } from './ui/tutorial.js';
import { initBudgetUI, renderRevRows, renderBudRows, renderBudgetFooter } from './ui/budget-ui.js';
import { initTransactionsUI, renderExpenses, updateTracker, resetTxFilters } from './ui/transactions-ui.js';
import { initGoalsUI, renderGoals } from './ui/goals-ui.js';
import { initAiChatUI, loadAiHistory } from './ui/ai-chat-ui.js';
import { initGreetingUI, renderGreeting, scheduleAiGreeting } from './ui/greeting.js';
import { initSettingsUI, setCurrency } from './ui/settings-ui.js';
import { initDataManagementUI } from './ui/data-management-ui.js';
import { initPwaUI, showPwaPopup } from './ui/pwa-ui.js';
import { scheduleDailyPush } from './ui/push-notify.js';
import { initToast } from './ui/toast.js';

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
  resetTxFilters();
  // Goals are NOT reloaded on month change (FR-007 — independent lifecycle)
  _notifyAll();
}

function _buildState() {
  const month = `${_Y}-${String(_M + 1).padStart(2, '0')}`;
  return {
    budget:       store.get('mfx_budget'),
    transactions: store.get('mfx_transactions') || [],
    goals:        store.get('mfx_goals') || [],
    month,
    year: _Y,
  };
}

// Render only the views that depend on the changed data slices.
//   b = budget changed, t = transactions changed, g = goals changed
function _renderViews(b, t, g) {
  const state = _buildState();
  if (b || t) renderAll(state);                               // dashboard ← budget + transactions
  if (b)      { renderRevRows(state); renderBudRows(state); } // budget page rows ← budget
  if (b || t) renderBudgetFooter(state);                      // footer ← budget + ponctuels (transactions)
  if (t)      renderExpenses(state);                          // transaction list ← transactions
  if (b || t) updateTracker(state);                           // tracker totals ← budget + transactions
  if (g)      renderGoals(state);                             // goals page ← goals
  scheduleAiGreeting();
}

// Coalesce multiple store writes in the same tick into a single targeted render.
const _dirty = new Set();
let _renderScheduled = false;
function _scheduleRender(key) {
  _dirty.add(key);
  if (_renderScheduled) return;
  _renderScheduled = true;
  queueMicrotask(() => {
    if (!_renderScheduled) return;          // a full sync render already ran this tick
    _renderScheduled = false;
    const b = _dirty.has('mfx_budget');
    const t = _dirty.has('mfx_transactions');
    const g = _dirty.has('mfx_goals');
    _dirty.clear();
    _renderViews(b, t, g);
  });
}

// Force a full synchronous render (month change, currency change, init).
function _notifyAll() {
  _renderScheduled = false;                 // cancel any pending coalesced render
  _dirty.clear();
  _renderViews(true, true, true);
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

  // Wire budget UI module (exposes addRev, delRev etc. on window)
  initBudgetUI(() => [_Y, _M]);

  // Wire transactions UI module (exposes addTx, delTx etc. on window)
  initTransactionsUI(() => [_Y, _M]);

  // Wire goals UI module (exposes addGoal, delGoal etc. on window)
  initGoalsUI();

  // Wire AI chat UI module (exposes sendAI, clearAiHistory, typeWriter on window)
  initAiChatUI(() => [_Y, _M]);

  // Wire greeting UI module
  initGreetingUI(() => [_Y, _M]);

  // Wire toast (exposes window.toastUndo for inline onclick)
  initToast();

  // Wire settings, data management, and PWA UI modules
  initSettingsUI(() => _notifyAll());
  initDataManagementUI();
  initPwaUI();

  // Refresh currency DOM labels with saved currency (setActiveCurrency already set module state above)
  setCurrency(prefs.currency);

  // Load AI conversation history once on init
  loadAiHistory();

  // Expose theme and navigation functions for inline onclick handlers
  window.setTheme    = setTheme;
  window.changeMonth = changeMonth;

  // Init donut ResizeObserver
  initDashboard();

  // Targeted re-render: each data slice notifies only the views that depend on it
  store.subscribe('mfx_budget',       () => _scheduleRender('mfx_budget'));
  store.subscribe('mfx_transactions', () => _scheduleRender('mfx_transactions'));
  store.subscribe('mfx_goals',        () => _scheduleRender('mfx_goals'));

  // Initial render
  _notifyAll();

  // Render greeting once — not on every store update to avoid breaking name edit
  renderGreeting();

  // Show tutorial on first launch (600ms delay)
  maybeShowTuto();

  // Show PWA install prompt on eligible devices (mobile only, 800ms delay internal)
  showPwaPopup();

  // Si le tuto est déjà fait et app en standalone → demande les notifs après 1.5s
  const tutoDone = localStorage.getItem('myfinanx-tuto-done') || localStorage.getItem('monargent-onboarded');
  if (tutoDone) setTimeout(() => window.requestPushPermission?.(), 1500);

  // Programme la notification push personnalisée du soir (une fois par jour, non bloquant)
  scheduleDailyPush();
}

// Modules are deferred — monolith's inline init() runs first, then this wires the modular layer
document.addEventListener('DOMContentLoaded', init);
