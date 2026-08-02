// ═══ Statistiques — page plein écran : revenus vs dépenses, répartition, chiffres clés ═══
// Données agrégées depuis l'historique mensuel (localStorage monargent_YYYY_MM).
// Graphiques en SVG fait main (aucune dépendance), cohérents avec le donut existant.

import { fmt } from '../currency.js';
import { CAT_COLORS, esc } from '../utils.js';

const MONTHS_SHORT = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'aoû', 'sep', 'oct', 'nov', 'déc'];
const FALLBACK_COLORS = ['#e87a7a', '#7BA3F0', '#34d399', '#a78bfa', '#f59e0b', '#f472b6', '#22d3ee', '#c084fc'];

// Géométrie des barres par période (barre fine pour 12 mois)
const BAR_GEOM = {
  3:  { barW: 20, gap: 5 },
  6:  { barW: 13, gap: 4 },
  12: { barW: 7,  gap: 2 },
};

let _getYM  = () => { const n = new Date(); return [n.getFullYear(), n.getMonth()]; };
let _period = 6;

export function initStatsUI(getYM) {
  if (getYM) _getYM = getYM;
  window.openStats      = openStats;
  window.setStatsPeriod = setStatsPeriod;
}

// ── Lecture des données ───────────────────────────────────────────
function monthKey(Y, M) { return `monargent_${Y}_${String(M + 1).padStart(2, '0')}`; }

function readMonth(Y, M) {
  try {
    const raw = localStorage.getItem(monthKey(Y, M));
    if (!raw) return null;
    const p = JSON.parse(raw);
    return {
      revenus:  Array.isArray(p.revenus)  ? p.revenus  : [],
      expenses: Array.isArray(p.expenses) ? p.expenses : [],
    };
  } catch (e) { return null; }
}

// Les `period` derniers mois (ancrés sur le mois courant), totaux revenus/dépenses par mois
function buildMonths(period) {
  const [Y, M] = _getYM();
  const arr = [];
  for (let i = period - 1; i >= 0; i--) {
    let m = M - i, y = Y;
    while (m < 0) { m += 12; y -= 1; }
    const data = readMonth(y, m);
    let income = 0, expense = 0;
    if (data) {
      income  = data.revenus.reduce((s, r) => s + (r.amount || 0), 0)
              + data.expenses.filter(e => e.type === 'income').reduce((s, e) => s + (e.amount || 0), 0);
      expense = data.expenses.filter(e => e.type !== 'income').reduce((s, e) => s + (e.amount || 0), 0);
    }
    arr.push({ y, m, label: MONTHS_SHORT[m], income, expense });
  }
  return arr;
}

// Dépenses agrégées par catégorie sur la période
function buildCategories(months) {
  const bycat = {};
  for (const mo of months) {
    const data = readMonth(mo.y, mo.m);
    if (!data) continue;
    data.expenses.filter(e => e.type !== 'income').forEach(e => {
      const c = e.cat || e.category || 'Autre';
      bycat[c] = (bycat[c] || 0) + (e.amount || 0);
    });
  }
  return Object.entries(bycat).sort((a, b) => b[1] - a[1]);
}

// ── Ouverture / filtre ────────────────────────────────────────────
export function openStats() {
  render();
  window.openScreen?.('screen-stats');
}

export function setStatsPeriod(n) {
  _period = n;
  render();
}

// ── Rendu ─────────────────────────────────────────────────────────
function render() {
  const months     = buildMonths(_period);
  const categories = buildCategories(months);
  const totalInc = months.reduce((s, m) => s + m.income, 0);
  const totalExp = months.reduce((s, m) => s + m.expense, 0);
  const savings  = totalInc - totalExp;
  const rate     = totalInc > 0 ? Math.round((savings / totalInc) * 100) : 0;

  // Pills de période
  document.querySelectorAll('#stats-period .stt-pill').forEach(b => {
    b.classList.toggle('active', Number(b.dataset.p) === _period);
  });

  renderKeyFigures(totalInc, totalExp, savings, rate);
  renderTrend(months);
  renderDonut(categories, totalExp);
}

function renderKeyFigures(inc, exp, savings, rate) {
  const el = document.getElementById('stats-kfig');
  if (!el) return;
  const savCls = savings >= 0 ? 'pos' : 'neg';
  el.innerHTML = `
    <div class="stt-kf">
      <span class="stt-kf-lbl">Revenus</span>
      <span class="stt-kf-val pos">${fmt(inc)}</span>
    </div>
    <div class="stt-kf">
      <span class="stt-kf-lbl">Dépenses</span>
      <span class="stt-kf-val neg">${fmt(exp)}</span>
    </div>
    <div class="stt-kf">
      <span class="stt-kf-lbl">Épargne</span>
      <span class="stt-kf-val ${savCls}">${fmt(savings)}</span>
    </div>
    <div class="stt-kf">
      <span class="stt-kf-lbl">Taux d'épargne</span>
      <span class="stt-kf-val">${rate}%</span>
    </div>`;
}

function renderTrend(months) {
  const el = document.getElementById('stats-trend');
  if (!el) return;
  const max = Math.max(1, ...months.map(m => Math.max(m.income, m.expense)));
  const W = 340, H = 168, padTop = 12, padBottom = 26;
  const plotH   = H - padTop - padBottom;
  const baseY   = padTop + plotH;
  const n       = months.length;
  const groupW  = W / n;
  const { barW, gap } = BAR_GEOM[_period] || BAR_GEOM[6];
  const pairW   = barW * 2 + gap;

  let bars = `<line x1="0" y1="${baseY}" x2="${W}" y2="${baseY}" stroke="var(--b1)" stroke-width="1"/>`;
  months.forEach((mo, i) => {
    const gx  = i * groupW + (groupW - pairW) / 2;
    const ih  = (mo.income  / max) * plotH;
    const eh  = (mo.expense / max) * plotH;
    bars += `<rect x="${(gx).toFixed(1)}" y="${(baseY - ih).toFixed(1)}" width="${barW}" height="${Math.max(0, ih).toFixed(1)}" rx="2.5" fill="var(--green)"/>`;
    bars += `<rect x="${(gx + barW + gap).toFixed(1)}" y="${(baseY - eh).toFixed(1)}" width="${barW}" height="${Math.max(0, eh).toFixed(1)}" rx="2.5" fill="var(--red-l)"/>`;
    bars += `<text x="${(i * groupW + groupW / 2).toFixed(1)}" y="${H - 9}" text-anchor="middle" font-size="10.5" fill="var(--muted)" font-family="var(--fb)">${mo.label}</text>`;
  });

  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Revenus et dépenses par mois">${bars}</svg>`;
}

function renderDonut(categories, totalExp) {
  const svgWrap = document.getElementById('stats-donut');
  const legEl   = document.getElementById('stats-donut-leg');
  if (!svgWrap || !legEl) return;

  if (!categories.length || totalExp <= 0) {
    svgWrap.innerHTML = '';
    legEl.innerHTML   = '<div class="stt-empty">Pas encore de dépenses sur cette période.</div>';
    return;
  }

  const cx = 70, cy = 70, R = 54, stroke = 16, circ = 2 * Math.PI * R;
  const colorOf = (c, i) => CAT_COLORS[c] || FALLBACK_COLORS[i % FALLBACK_COLORS.length];

  let arcs = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="var(--b1)" stroke-width="${stroke}"/>`;
  let offset = 0;
  categories.forEach(([c, amt], i) => {
    const pct = amt / totalExp;
    if (pct <= 0) return;
    const dash = pct * circ;
    const deg  = offset * 360 - 90;
    arcs += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${colorOf(c, i)}" stroke-width="${stroke}"
      stroke-dasharray="${dash.toFixed(2)} ${(circ - dash).toFixed(2)}"
      style="transform:rotate(${deg.toFixed(2)}deg);transform-origin:${cx}px ${cy}px;transition:stroke-dasharray .5s ease;"/>`;
    offset += pct;
  });
  arcs += `<circle cx="${cx}" cy="${cy}" r="40" fill="var(--s1)"/>`;
  arcs += `<text x="${cx}" y="${cy - 3}" text-anchor="middle" font-size="9" fill="var(--muted)" font-family="var(--fb)">Dépenses</text>`;
  arcs += `<text x="${cx}" y="${cy + 12}" text-anchor="middle" font-size="14" font-weight="800" fill="var(--text)" font-family="var(--fh)">${fmt(totalExp)}</text>`;

  svgWrap.innerHTML = `<svg viewBox="0 0 140 140" width="140" height="140" role="img" aria-label="Répartition des dépenses par catégorie">${arcs}</svg>`;

  legEl.innerHTML = categories.slice(0, 8).map(([c, amt], i) => {
    const pct = Math.round((amt / totalExp) * 100);
    return `<div class="stt-leg-item">
      <span class="stt-leg-dot" style="background:${colorOf(c, i)}"></span>
      <span class="stt-leg-name">${esc(c)}</span>
      <span class="stt-leg-pct">${pct}%</span>
      <span class="stt-leg-val">${fmt(amt)}</span>
    </div>`;
  }).join('');
}
