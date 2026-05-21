// ═══ Utilities — pure helpers extracted from the monolith ═══

export function uid() { return Math.random().toString(36).slice(2, 10); }
export function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

export function todayISO() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`;
}

export function fmtDate(iso) {
  if (!iso) return '';
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  const [, mo, d] = parts.map(Number);
  const SHORT = ['jan','fév','mar','avr','mai','juin','juil','aoû','sep','oct','nov','déc'];
  return `${d} ${SHORT[mo-1]}`;
}

// Accept comma or dot as decimal separator
export function parseAmt(str) {
  return parseFloat(String(str).replace(',', '.')) || 0;
}

export function catIco(cat, size = 14) {
  const path = CAT_ICONS[cat] || CAT_ICONS['Autre'];
  const col  = CAT_COLORS[cat] || 'var(--muted)';
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${col}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
}

export const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

export const CAT_ICONS = {
  'Alimentation': '<path d="M3 2l1.5 15.5a2 2 0 0 0 2 1.5h11a2 2 0 0 0 2-1.5L21 2"/><path d="M9 2v6M15 2v6"/>',
  'Transport':    '<circle cx="5" cy="17" r="2"/><circle cx="19" cy="17" r="2"/><path d="M5 17H3v-6l2-5h14l2 5v6h-2M9 17H15M3 11h18"/>',
  'Téléphone':    '<rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>',
  'Dette':        '<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 5 5 12"/>',
  'Logement':     '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  'Matériel':     '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
  'Business':     '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>',
  'Marketing':    '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
  'Imprévu':      '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
  'Loisirs':      '<circle cx="12" cy="12" r="10"/><path d="M8.56 2.75c4.37 6.03 6.02 9.42 8.03 17.72m2.54-15.38c-3.72 4.35-8.94 5.66-16.88 5.85m19.5 1.9c-3.5-.93-6.63-.82-8.94 0-2.58.92-5.01 2.86-7.44 6.32"/>',
  'Santé':        '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  'Salaire':      '<rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  'Stage':        '<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
  'Freelance':    '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  'Commerce':     '<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>',
  'Loyers':       '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  'Dividendes':   '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
  'Pension':      '<circle cx="12" cy="8" r="5"/><path d="M3 21v-2a7 7 0 0 1 7-7h4a7 7 0 0 1 7 7v2"/>',
  'Allocations':  '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  'Tontine':      '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  'Aide famille': '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
  'Bourse':       '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  'Agriculture':  '<path d="M12 22V12"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/><path d="M8 6a4 4 0 0 0 8 0"/><path d="M12 2v4"/>',
  'Scolarité':    '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  'Éducation':    '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  'Abonnements':  '<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
  'Famille':      '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  'Cérémonie':    '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  'Autre':        '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
};

export const CAT_COLORS = {
  'Alimentation':'#e87a7a','Transport':'#7BA3F0','Téléphone':'#a78bfa',
  'Dette':'#C43A3A','Logement':'#4D78D4','Matériel':'#38bdf8',
  'Business':'#34d399','Marketing':'#f472b6',
  'Imprévu':'#6b84ad','Loisirs':'#e879f9','Santé':'#34d399',
  'Salaire':'#34d399','Stage':'#4D78D4','Freelance':'#a78bfa',
  'Commerce':'#f59e0b','Loyers':'#4D78D4','Dividendes':'#34d399',
  'Pension':'#7BA3F0','Allocations':'#a78bfa','Tontine':'#f472b6',
  'Aide famille':'#e879f9','Bourse':'#38bdf8','Agriculture':'#86efac',
  'Éducation':'#fbbf24','Scolarité':'#fbbf24','Abonnements':'#6b84ad','Famille':'#e87a7a',
  'Cérémonie':'#fb923c','Autre':'#6b84ad',
};

export const CATS_E = ['Alimentation','Transport','Logement','Santé','Téléphone','Abonnements','Dette','Scolarité','Famille','Cérémonie','Matériel','Business','Marketing','Loisirs','Imprévu','Autre'];
export const CATS_I = ['Salaire','Freelance','Commerce','Business','Loyers','Tontine','Aide famille','Agriculture','Dividendes','Bourse','Pension','Allocations','Stage','Autre'];
export const COLS   = ['#7BA3F0','#4D78D4','#34d399','#a78bfa','#f59e0b','#e87a7a','#e879f9'];
