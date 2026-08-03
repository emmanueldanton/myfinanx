/* ════════════════════════════════════════════════════════════════════
   PALETTES — light (aéré, par défaut) + 2 thèmes sombres raffinés.
   theme.js pose ces tokens en inline sur <html> → source de vérité au
   runtime (gagne sur toutes les feuilles :root). Garder index.html
   (script anti-FOUC) et themes.css alignés sur ces valeurs.
════════════════════════════════════════════════════════════════════ */
const THEMES = {
  // ─── Clair & aéré (défaut, = Sleek) ───
  light: {
    '--bg':        '#F7F9FC',
    '--s0':        '#F7F9FC',
    '--s1':        '#FFFFFF',
    '--s2':        '#F3F4F6',
    '--b1':        '#E5E7EB',
    '--b2':        '#D8DDE5',
    '--pr':        '#2F6BFF',
    '--pr-l':      '#1E54E0',
    '--pr-d':      '#1A47C0',
    '--text':      '#111827',
    '--muted':     '#6B7280',
    '--faint':     '#9AA6BD',
    '--red':       '#E5484D',
    '--red-l':     '#DA3A40',
    '--green':     '#12A971',
    '--gold':      '#D98A00',
    '--violet':    '#6D55F2',
    '--header-bg': 'rgba(247,249,252,.82)',
    '--shadow-lg': 'rgba(28,45,80,.14)',
    '--shadow-card':'0 1px 3px rgba(20,40,80,.04), 0 8px 24px rgba(20,40,80,.06)',
    '--shadow-soft':'0 6px 22px rgba(20,40,80,.08)',
    '--shadow-pop': '0 18px 44px rgba(20,40,80,.18)',
    '--grad1':     'transparent',
    '--grad2':     'transparent',
    '--ai-bg1':    '#F7F9FC',
    '--ai-bg2':    '#F7F9FC',
    '--ai-bdr':    '#E5E7EB',
    '--ai-msg-bg': 'rgba(243,244,246,.8)',
    '--ai-msg-col':'#2F6BFF',
    '--dot-active':'rgba(20,40,80,.55)',
    '--chat-bg':   '#F7F9FC',
    '--bubble-bot':'#FFFFFF',
    '--logo-bg':   '#EAF1FF',
    '--page-bg':   '#F7F9FC',
    '--glass-hi':  'transparent',
  },
  // ─── Sombre bleu nuit (fond neutre partagé, accent bleu) ───
  blue: {
    '--bg':        '#0B0E14',
    '--s0':        '#0E121A',
    '--s1':        '#151A23',
    '--s2':        '#1C222D',
    '--b1':        '#242B37',
    '--b2':        '#313A48',
    '--pr':        '#5B8DEF',
    '--pr-l':      '#89B0F7',
    '--pr-d':      '#3F6FD0',
    '--text':      '#EAEEF6',
    '--muted':     '#8792A6',
    '--faint':     '#79839A',
    '--red':       '#F0656A',
    '--red-l':     '#F58A8E',
    '--green':     '#34D399',
    '--gold':      '#FBBF24',
    '--violet':    '#A78BFA',
    '--header-bg': 'rgba(11,14,20,.82)',
    '--shadow-lg': 'rgba(0,0,0,.55)',
    '--shadow-card':'0 1px 3px rgba(0,0,0,.3), 0 8px 24px rgba(0,0,0,.35)',
    '--shadow-soft':'0 6px 22px rgba(0,0,0,.42)',
    '--shadow-pop': '0 18px 44px rgba(0,0,0,.6)',
    '--grad1':     'transparent',
    '--grad2':     'transparent',
    '--ai-bg1':    '#0E121A',
    '--ai-bg2':    '#0E121A',
    '--ai-bdr':    '#242B37',
    '--ai-msg-bg': 'rgba(28,34,45,.6)',
    '--ai-msg-col':'#3050a0',
    '--dot-active':'rgba(255,255,255,.85)',
    '--chat-bg':   '#0E121A',
    '--bubble-bot':'#1C222D',
    '--logo-bg':   '#1C222D',
    '--page-bg':   '#0B0E14',
    '--glass-hi':  'transparent',
  },
  // ─── Sombre violet (MÊME fond neutre, accent violet) ───
  violet: {
    '--bg':        '#0B0E14',
    '--s0':        '#0E121A',
    '--s1':        '#151A23',
    '--s2':        '#1C222D',
    '--b1':        '#242B37',
    '--b2':        '#313A48',
    '--pr':        '#9D7BF0',
    '--pr-l':      '#BBA0F8',
    '--pr-d':      '#7D5FD6',
    '--text':      '#EAEEF6',
    '--muted':     '#8792A6',
    '--faint':     '#79839A',
    '--red':       '#F0656A',
    '--red-l':     '#F58A8E',
    '--green':     '#34D399',
    '--gold':      '#FBBF24',
    '--violet':    '#B9A6FF',
    '--header-bg': 'rgba(11,14,20,.82)',
    '--shadow-lg': 'rgba(0,0,0,.55)',
    '--shadow-card':'0 1px 3px rgba(0,0,0,.3), 0 8px 24px rgba(0,0,0,.35)',
    '--shadow-soft':'0 6px 22px rgba(0,0,0,.42)',
    '--shadow-pop': '0 18px 44px rgba(0,0,0,.6)',
    '--grad1':     'transparent',
    '--grad2':     'transparent',
    '--ai-bg1':    '#0E121A',
    '--ai-bg2':    '#0E121A',
    '--ai-bdr':    '#242B37',
    '--ai-msg-bg': 'rgba(28,34,45,.6)',
    '--ai-msg-col':'#5040a0',
    '--dot-active':'rgba(255,255,255,.85)',
    '--chat-bg':   '#0E121A',
    '--bubble-bot':'#1C222D',
    '--logo-bg':   '#1C222D',
    '--page-bg':   '#0B0E14',
    '--glass-hi':  'transparent',
  },
};

export function setTheme(name) {
  const t = THEMES[name] || THEMES.light;
  Object.entries(t).forEach(([k, v]) => document.documentElement.style.setProperty(k, v));
  document.documentElement.dataset.theme = name;
  syncThemeDots(name);
  try {
    localStorage.setItem('monargent-theme', name);
    localStorage.setItem('mfx_theme', name);
  } catch (_) {}
}

export function syncThemeDots(name) {
  document.querySelectorAll('.tdot, .dtdot').forEach(el => {
    el.classList.toggle('on', el.dataset.theme === name);
  });
}

export function loadTheme() {
  const saved = localStorage.getItem('monargent-theme') || localStorage.getItem('mfx_theme') || 'light';
  setTheme(saved);
  return saved;
}
