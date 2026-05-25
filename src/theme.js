const THEMES = {
  blue: {
    '--bg':        '#000000',
    '--s0':        '#080c14',
    '--s1':        '#0f1520',
    '--s2':        '#161e2e',
    '--b1':        '#202840',
    '--b2':        '#2c3a58',
    '--pr':        '#4D78D4',
    '--pr-l':      '#7BA3F0',
    '--pr-d':      '#3560b8',
    '--text':      '#edeff5',
    '--muted':     '#6878a0',
    '--faint':     '#1a2238',
    '--red':       '#C43A3A',
    '--red-l':     '#e87a7a',
    '--green':     '#34d399',
    '--gold':      '#f59e0b',
    '--violet':    '#a78bfa',
    '--header-bg': 'rgba(0,0,0,.88)',
    '--shadow-lg': 'rgba(0,0,0,.6)',
    '--grad1':     'rgba(77,120,212,.08)',
    '--grad2':     'rgba(196,58,58,.04)',
    '--ai-bg1':    '#06080f',
    '--ai-bg2':    '#0a0810',
    '--ai-bdr':    '#1a2238',
    '--ai-msg-bg': 'rgba(6,8,20,.6)',
    '--ai-msg-col':'#3050a0',
    '--dot-active':'rgba(255,255,255,.7)',
    '--chat-bg':   '#06080f',
    '--bubble-bot':'#0f1520',
    '--logo-bg':   '#0f1520',
  },
  violet: {
    '--bg':        '#050408',
    '--s0':        '#0c0a12',
    '--s1':        '#131020',
    '--s2':        '#1a1628',
    '--b1':        '#26203c',
    '--b2':        '#342c50',
    '--pr':        '#7A6BC4',
    '--pr-l':      '#a897e8',
    '--pr-d':      '#5a4fb0',
    '--text':      '#eceaff',
    '--muted':     '#7870a8',
    '--faint':     '#1e1830',
    '--red':       '#C43A3A',
    '--red-l':     '#e87a7a',
    '--green':     '#34d399',
    '--gold':      '#f59e0b',
    '--violet':    '#a78bfa',
    '--header-bg': 'rgba(5,4,8,.90)',
    '--shadow-lg': 'rgba(0,0,0,.6)',
    '--grad1':     'rgba(122,107,196,.08)',
    '--grad2':     'rgba(196,58,58,.04)',
    '--ai-bg1':    '#07050e',
    '--ai-bg2':    '#0c0914',
    '--ai-bdr':    '#201a38',
    '--ai-msg-bg': 'rgba(8,6,18,.6)',
    '--ai-msg-col':'#5040a0',
    '--dot-active':'rgba(255,255,255,.7)',
    '--chat-bg':   '#08060e',
    '--bubble-bot':'#131020',
    '--logo-bg':   '#131020',
  },
  light: {
    '--bg':        '#ffffff',
    '--s0':        '#fafafa',
    '--s1':        '#ffffff',
    '--s2':        '#f5f5f5',
    '--b1':        '#e8e8e8',
    '--b2':        '#d4d4d4',
    '--pr':        '#4D78D4',
    '--pr-l':      '#2a5bc4',
    '--pr-d':      '#1a4ab0',
    '--text':      '#111111',
    '--muted':     '#737373',
    '--faint':     '#f0f0f0',
    '--red':       '#b83030',
    '--red-l':     '#b83030',
    '--green':     '#1a9c6e',
    '--gold':      '#c97a00',
    '--violet':    '#7c3aed',
    '--header-bg': 'rgba(255,255,255,.90)',
    '--shadow-lg': 'rgba(0,0,0,.08)',
    '--grad1':     'rgba(0,0,0,.03)',
    '--grad2':     'rgba(0,0,0,.01)',
    '--ai-bg1':    '#fafafa',
    '--ai-bg2':    '#f5f5f5',
    '--ai-bdr':    '#e8e8e8',
    '--ai-msg-bg': 'rgba(245,245,245,.8)',
    '--ai-msg-col':'#5070c0',
    '--dot-active':'rgba(0,0,0,.5)',
    '--chat-bg':   '#fafafa',
    '--bubble-bot':'#ffffff',
    '--logo-bg':   '#f5f5f5',
  },
};

export function setTheme(name) {
  const t = THEMES[name] || THEMES.blue;
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
  const saved = localStorage.getItem('monargent-theme') || localStorage.getItem('mfx_theme') || 'blue';
  setTheme(saved);
  return saved;
}
