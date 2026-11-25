import { fmt } from '../currency.js';

let _lastDonutArgs = [0, 0, 0];
let _donutObserver = null;

export function initDonutResizeObserver(containerSelector = '.ov-donut-wrap') {
  const wrap = document.querySelector(containerSelector);
  if (!wrap || !window.ResizeObserver) return;
  _donutObserver = new ResizeObserver(() => renderDonut(..._lastDonutArgs));
  _donutObserver.observe(wrap);
}

export function renderDonut(spent, revenue, budget) {
  _lastDonutArgs = [spent, revenue, budget];
  const svg = document.getElementById('donut-svg');
  if (!svg) return;

  const cx = 65, cy = 65, R = 52, stroke = 14;
  const circ = 2 * Math.PI * R;
  const maxVal = Math.max(revenue, 1);
  const spentPct   = Math.min(spent / maxVal, 1);
  const budgetPct  = Math.min(budget / maxVal, 1);
  const unspentPct = Math.max(budgetPct - spentPct, 0);
  const freePct    = Math.max(1 - budgetPct, 0);

  function arc(pct, offset, color, opacity = 1) {
    if (pct <= 0) return '';
    const dash = pct * circ;
    const gap  = circ - dash;
    const deg  = offset * 360 - 90;
    return `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${color}" stroke-width="${stroke}"
      stroke-dasharray="${dash} ${gap}" stroke-dashoffset="0"
      style="transform:rotate(${deg}deg);transform-origin:${cx}px ${cy}px;opacity:${opacity};transition:stroke-dasharray .5s ease;"/>`;
  }

  let html = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="var(--b1)" stroke-width="${stroke}"/>`;
  html += arc(freePct,     spentPct + unspentPct, '#a78bfa', 0.7);
  html += arc(unspentPct,  spentPct,              '#4D78D4', 0.9);
  html += arc(spentPct,    0,                     '#e87a7a', 1);
  html += `<circle cx="${cx}" cy="${cy}" r="38" fill="var(--s1)"/>`;
  svg.innerHTML = html;

  const pct = revenue > 0 ? Math.round((spent / revenue) * 100) : 0;
  const pctEl = document.getElementById('donut-pct');
  if (pctEl) pctEl.textContent = pct + '%';

  const leg = document.getElementById('donut-legend');
  if (leg) {
    leg.innerHTML = [
      { color: '#e87a7a', label: 'Dépensé',        val: fmt(spent) },
      { color: '#4D78D4', label: 'Alloué restant',  val: fmt(Math.max(0, budget - spent)) },
      { color: '#a78bfa', label: 'Libre',            val: fmt(Math.max(0, revenue - budget)) },
    ].map(l => `<div class="donut-leg-item">
      <div class="donut-leg-dot" style="background:${l.color}"></div>
      <span class="donut-leg-name">${l.label}</span>
      <span class="donut-leg-val" style="color:${l.color}">${l.val}</span>
    </div>`).join('');
  }
}
