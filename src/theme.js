const THEMES = {
  blue: {
    '--s0': '#0d1628', '--s1': '#111d35', '--s2': '#172240',
    '--b1': '#1e2f52', '--b2': '#243662',
    '--text': '#e8eef8', '--muted': '#7a90b8',
    '--pr': '#4D78D4', '--pr-l': '#7BA3F0',
    '--red': '#c44444', '--red-l': '#e87a7a',
    '--green': '#34d399', '--gold': '#f59e0b',
    '--dot-active': 'rgba(255,255,255,.5)',
    '--chat-bg': '#111d35', '--bubble-bot': '#1a2b4a', '--logo-bg': '#172240',
  },
  violet: {
    '--s0': '#0c0a10', '--s1': '#141020', '--s2': '#1a142e',
    '--b1': '#241c3e', '--b2': '#2e2450',
    '--text': '#ece8f8', '--muted': '#9080c8',
    '--pr': '#7A6BC4', '--pr-l': '#a99ce8',
    '--red': '#c44444', '--red-l': '#e87a7a',
    '--green': '#34d399', '--gold': '#f59e0b',
    '--dot-active': 'rgba(255,255,255,.5)',
    '--chat-bg': '#141020', '--bubble-bot': '#1e1838', '--logo-bg': '#1a142e',
  },
  light: {
    '--s0': '#f0f4ff', '--s1': '#ffffff', '--s2': '#f8f9fe',
    '--b1': '#e2e8f8', '--b2': '#c8d4f0',
    '--text': '#1a1f36', '--muted': '#737373',
    '--pr': '#4D78D4', '--pr-l': '#2c5ab5',
    '--red': '#c0392b', '--red-l': '#c44444',
    '--green': '#22a86a', '--gold': '#d97706',
    '--dot-active': 'rgba(0,0,0,.5)',
    '--chat-bg': '#fafafa', '--bubble-bot': '#ffffff', '--logo-bg': '#f5f5f5',
  },
};

export function setTheme(name) {
  const t = THEMES[name] || THEMES.light;
  Object.entries(t).forEach(([k, v]) => document.documentElement.style.setProperty(k, v));
  document.documentElement.dataset.theme = name;
  syncThemeDots(name);
  try { localStorage.setItem('mfx_theme', name); } catch (_) {}
}

export function syncThemeDots(name) {
  document.querySelectorAll('.tdot, .dtdot').forEach(el => {
    el.classList.toggle('on', el.dataset.theme === name);
  });
}

export function loadTheme() {
  const saved = localStorage.getItem('mfx_theme') || localStorage.getItem('monargent-theme') || 'light';
  setTheme(saved);
  return saved;
}
