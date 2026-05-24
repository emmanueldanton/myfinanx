// ═══ Greeting UI — salutation dashboard + message IA contextuel ═══
import { store }              from '../store.js';
import { esc }                from '../utils.js';
import { fmt, getActiveCurrency } from '../currency.js';

const GREETING_CACHE_KEY = 'monargent-greeting-ai';
const USER_KEY           = 'monargent-username';
const GENDER_KEY         = 'monargent-usergender';
const MONTHS             = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

let _greetAiTimer = null;
let _getYM        = () => { const n = new Date(); return [n.getFullYear(), n.getMonth()]; };

// ── Init ──────────────────────────────────────────────────────────

export function initGreetingUI(getYM) {
  _getYM = getYM;
  window.renderGreeting = renderGreeting;
  window.editGreetName  = editGreetName;
}

// ── Render ────────────────────────────────────────────────────────

export function renderGreeting() {
  const wrap = document.getElementById('greet-wrap');
  if (!wrap) return;

  const hour = new Date().getHours();
  let greet, emoji;
  if      (hour >= 5  && hour < 12) { greet = 'Bon matin';      emoji = '🌅'; }
  else if (hour >= 12 && hour < 18) { greet = 'Bon après-midi'; emoji = '⛅'; }
  else if (hour >= 18 && hour < 22) { greet = 'Bonsoir';        emoji = '🌆'; }
  else                               { greet = 'Bonne nuit';     emoji = '🌙'; }

  const name = localStorage.getItem(USER_KEY) || 'toi';
  let sub = _greetFinancialSub();
  try {
    const cached = JSON.parse(localStorage.getItem(GREETING_CACHE_KEY) || 'null');
    if (cached && cached.hash === greetDataHash() && cached.msg) sub = cached.msg;
  } catch (e) {}

  wrap.innerHTML = `
    <div class="greet-title">
      ${greet},&nbsp;<span class="greet-name" id="greet-name" onclick="editGreetName()" title="Clique pour modifier ton prénom">${esc(name)}</span>&nbsp;!&nbsp;<span class="greet-emoji">${emoji}</span>
    </div>
    <div class="greet-sub">${esc(sub)}</div>`;

  _showGenderPick();
  scheduleAiGreeting();
}

function _showGenderPick() {
  const wrap = document.getElementById('greet-wrap');
  if (!wrap) return;
  const cur = localStorage.getItem(GENDER_KEY);
  if (cur || !localStorage.getItem(USER_KEY)) return;
  const pick = document.createElement('div');
  pick.className = 'greet-gender-pick';
  ['M', 'F'].forEach(g => {
    const btn = document.createElement('button');
    btn.className = 'greet-gender-btn' + (cur === g ? ' on' : '');
    btn.textContent = g === 'M' ? 'Masculin' : 'Féminin';
    btn.onclick = () => { localStorage.setItem(GENDER_KEY, g); renderGreeting(); };
    pick.appendChild(btn);
  });
  const sub = wrap.querySelector('.greet-sub');
  if (sub) sub.after(pick);
}

export function editGreetName() {
  const span = document.getElementById('greet-name');
  if (!span) return;
  const cur   = localStorage.getItem(USER_KEY) || '';
  const input = document.createElement('input');
  input.className   = 'greet-name-input';
  input.value       = cur;
  input.maxLength   = 30;
  input.placeholder = 'Ton prénom…';
  const save = () => {
    const v = input.value.trim();
    if (v) localStorage.setItem(USER_KEY, v);
    renderGreeting();
  };
  input.addEventListener('blur', save);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter')  input.blur();
    if (e.key === 'Escape') renderGreeting();
  });
  span.replaceWith(input);
  input.focus(); input.select();
}

// ── Hash + scheduling ─────────────────────────────────────────────

export function greetDataHash() {
  const [Y, M]   = _getYM();
  const budget   = store.get('mfx_budget') ?? { incomes: [], budgetItems: [] };
  const txs      = store.get('mfx_transactions') || [];
  const goals    = store.get('mfx_goals') || [];
  const totalR   = (budget.incomes ?? []).reduce((s, r) => s + r.amountEUR, 0);
  const totalE   = txs.filter(t => t.type !== 'income').reduce((s, t) => s + t.amountEUR, 0);
  const goalsH   = goals.map(g => `${g.savedEUR}/${g.targetEUR}`).join(',');
  const nTxs     = txs.length;
  const nInc     = (budget.incomes ?? []).length;
  const cur      = getActiveCurrency().code;
  return `${Y}-${M}_${totalR}_${totalE}_${nInc}_${nTxs}_${goalsH}_${cur}`;
}

// Planifie le message IA — une seule fois par session, debounce 3s (FR-006)
export function scheduleAiGreeting() {
  if (sessionStorage.getItem('greetingDone')) return;
  clearTimeout(_greetAiTimer);
  _greetAiTimer = setTimeout(async () => {
    if (sessionStorage.getItem('greetingDone')) return;
    const aiMsg = await fetchAiGreetingSub();
    if (aiMsg) {
      sessionStorage.setItem('greetingDone', '1');
      const sub = document.querySelector('#greet-wrap .greet-sub');
      if (sub && window.typeWriter) window.typeWriter(sub, aiMsg);
    }
  }, 3000);
}

// ── AI call ───────────────────────────────────────────────────────

export async function fetchAiGreetingSub() {
  const [Y, M] = _getYM();
  const budget = store.get('mfx_budget') ?? { incomes: [], budgetItems: [] };
  const txs    = store.get('mfx_transactions') || [];
  const goals  = store.get('mfx_goals') || [];

  const incomes  = budget.incomes ?? [];
  const items    = budget.budgetItems ?? [];
  const depenses = txs.filter(t => t.type !== 'income');

  const totalR = incomes.reduce((s, r) => s + r.amountEUR, 0);
  if (incomes.length === 0) return null;

  const hash = greetDataHash();
  try {
    const cached = JSON.parse(localStorage.getItem(GREETING_CACHE_KEY) || 'null');
    if (cached && cached.hash === hash && cached.msg) return cached.msg;
  } catch (e) {}

  const totalE      = depenses.reduce((s, t) => s + t.amountEUR, 0);
  const totalB      = items.reduce((s, b) => s + b.allocatedEUR, 0);
  const reste       = totalR - totalE;
  const tauxEpargne = totalR > 0 ? Math.round((reste / totalR) * 100) : 0;

  const parCat = {};
  depenses.forEach(t => { parCat[t.category] = (parCat[t.category] || 0) + t.amountEUR; });
  const dépassés = items
    .filter(b => b.allocatedEUR > 0 && (parCat[b.name] || 0) > b.allocatedEUR)
    .map(b => b.name);

  const userName   = localStorage.getItem(USER_KEY);
  const userGender = localStorage.getItem(GENDER_KEY);
  const identityLine = userName
    ? `Prénom: ${userName}. Genre: ${userGender === 'F' ? 'féminin' : userGender === 'M' ? 'masculin' : 'non précisé'}.`
    : '';

  const goalsStr = goals.length
    ? goals.map(g => {
        const pct = g.targetEUR > 0 ? Math.round((g.savedEUR / g.targetEUR) * 100) : 0;
        return `${g.name}: ${fmt(g.savedEUR)}/${fmt(g.targetEUR)} (${pct}%)`;
      }).join(', ')
    : 'aucun objectif défini';

  const ctx      = `Tu es un conseiller financier bienveillant et direct. Réponds uniquement en français. Pas d'humour.`;
  const question = `${identityLine}
Situation de ${MONTHS[M]} ${Y} :
- Revenus: ${fmt(totalR)} (${incomes.length} source${incomes.length > 1 ? 's' : ''}: ${incomes.map(r => r.name).join(', ')})
- Budget alloué: ${fmt(totalB)} | Dépensé: ${fmt(totalE)} | Reste: ${fmt(reste)}
- Taux d'épargne: ${tauxEpargne}%${dépassés.length ? `\n- Postes dépassés: ${dépassés.join(', ')}` : ''}
- Objectifs: ${goalsStr}

Écris UNE seule phrase courte et percutante (max 18 mots) qui pointe le fait le plus important ou urgent de cette situation. Commence par UN seul émoji adapté à la situation, puis l'observation directement. Pas de salutation, pas d'introduction.`;

  try {
    const res  = await fetch('/api/ai', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ messages: [{ role: 'user', content: question }], context: ctx }),
    });
    const data = await res.json();
    const msg  = (data.reply || '').trim().replace(/^["'«»]|["'«»]$/g, '').trim();
    if (msg) {
      try { localStorage.setItem(GREETING_CACHE_KEY, JSON.stringify({ hash, msg })); } catch (e) {}
      return msg;
    }
  } catch (e) {}
  return null;
}

// ── Static fallback ───────────────────────────────────────────────

function _greetFinancialSub() {
  const budget  = store.get('mfx_budget') ?? { incomes: [] };
  const txs     = store.get('mfx_transactions') || [];
  const incomes = budget.incomes ?? [];
  const totalR  = incomes.reduce((s, r) => s + r.amountEUR, 0);
  const totalE  = txs.filter(t => t.type !== 'income').reduce((s, t) => s + t.amountEUR, 0);
  if (!incomes.length && totalE === 0)
    return 'Commence par saisir tes revenus dans l\'onglet Budget pour activer les conseils personnalisés.';
  if (incomes.length && totalR === 0 && totalE === 0)
    return 'Sources de revenus créées. Renseigne les montants pour activer l\'analyse.';
  return '…';
}
