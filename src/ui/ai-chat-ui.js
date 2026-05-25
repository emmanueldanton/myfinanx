// ═══ AI Chat UI — historique de conversation + envoi (onglet Conseiller IA) ═══
import { store }              from '../store.js';
import { esc }                from '../utils.js';
import { fmt, getActiveCurrency } from '../currency.js';

const AI_KEY      = 'monargent_ai_chat';
const USER_KEY    = 'monargent-username';
const GENDER_KEY  = 'monargent-usergender';
const MONTHS      = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

const AI_WELCOME  = '👋 Bonjour ! Je connais ta situation complète (revenus, budget, objectifs). Pose-moi n\'importe quelle question sur ta gestion financière !';
const BOT_AV_SVG  = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="9" width="18" height="13" rx="2"/><path d="M12 2v4"/><circle cx="12" cy="6" r="1.5" fill="white" stroke="none"/><circle cx="9" cy="15" r="1.5" fill="white" stroke="none"/><circle cx="15" cy="15" r="1.5" fill="white" stroke="none"/><path d="M9 19h6"/></svg>';

let _aiHistory = [];
let _twTimer   = null;
let _getYM     = () => { const n = new Date(); return [n.getFullYear(), n.getMonth()]; };

// ── Init ──────────────────────────────────────────────────────────

export function initAiChatUI(getYM) {
  _getYM = getYM;
  window.sendAI        = sendAI;
  window.clearAiHistory = clearAiHistory;
  window.typeWriter    = typeWriter;
  window.renderAiMsg   = renderAiMsg;
}

// ── Typewriter effect ─────────────────────────────────────────────

export function typeWriter(el, text, speed = 18) {
  if (_twTimer) clearInterval(_twTimer);
  el.textContent = '';
  let i = 0;
  _twTimer = setInterval(() => {
    el.textContent += text[i++];
    if (i >= text.length) { clearInterval(_twTimer); _twTimer = null; }
  }, speed);
}

// ── Render ────────────────────────────────────────────────────────

export function renderAiMsg(role, text) {
  const msgs = document.getElementById('ai-msgs');
  if (!msgs) return;
  const row = document.createElement('div');
  row.className = 'ai-row' + (role === 'user' ? ' usr' : '');
  if (role !== 'user') {
    const av = document.createElement('div');
    av.className = 'ai-bot-av';
    av.innerHTML = BOT_AV_SVG;
    row.appendChild(av);
  }
  const bubble = document.createElement('div');
  bubble.className = 'ai-bubble ' + (role === 'user' ? 'usr' : 'bot');
  bubble.innerHTML = text.replace(/\n/g, '<br>');
  row.appendChild(bubble);
  msgs.appendChild(row);
  msgs.scrollTop = msgs.scrollHeight;
}

// ── History persistence ───────────────────────────────────────────

export function saveAiHistory() {
  try {
    localStorage.setItem(AI_KEY, JSON.stringify(_aiHistory));
  } catch (e) {
    if (e.name === 'QuotaExceededError') console.warn('localStorage plein — historique IA non sauvegardé');
  }
}

export function loadAiHistory() {
  const msgs = document.getElementById('ai-msgs');
  if (!msgs) return;
  try {
    const raw = localStorage.getItem(AI_KEY);
    if (raw) {
      _aiHistory = JSON.parse(raw);
      msgs.innerHTML = '';
      _aiHistory.forEach(m => renderAiMsg(m.role, m.text));
      msgs.scrollTop = msgs.scrollHeight;
      return;
    }
  } catch (e) { _aiHistory = []; }
  msgs.innerHTML = '';
  renderAiMsg('ai', AI_WELCOME);
}

export function clearAiHistory() {
  if (!confirm('Effacer tout l\'historique de la conversation ?')) return;
  _aiHistory = [];
  localStorage.removeItem(AI_KEY);
  const msgs = document.getElementById('ai-msgs');
  if (msgs) { msgs.innerHTML = ''; renderAiMsg('ai', AI_WELCOME); }
}

// ── Send ──────────────────────────────────────────────────────────

export async function sendAI() {
  const inp  = document.getElementById('ai-q');
  const q    = inp.value.trim();
  if (!q) return;
  const btn  = document.getElementById('ai-btn');
  const msgs = document.getElementById('ai-msgs');
  btn.disabled = true; inp.disabled = true; inp.value = '';

  renderAiMsg('user', esc(q));

  const tid    = 'ty' + Date.now();
  const typRow = document.createElement('div');
  typRow.className = 'ai-row'; typRow.id = tid;
  const typAv  = document.createElement('div');
  typAv.className = 'ai-bot-av'; typAv.innerHTML = BOT_AV_SVG;
  const typBub = document.createElement('div');
  typBub.className = 'ai-bubble bot ai-typ';
  typBub.innerHTML = '<div class="ai-typ-dots"><div class="ai-typ-dot"></div><div class="ai-typ-dot"></div><div class="ai-typ-dot"></div></div>';
  typRow.appendChild(typAv); typRow.appendChild(typBub);
  msgs.appendChild(typRow);
  msgs.scrollTop = msgs.scrollHeight;

  const sys = _buildSystemPrompt();

  // Build messages from previous history BEFORE pushing current message — avoids duplication
  const messages = [
    ..._aiHistory.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text })),
    { role: 'user', content: q },
  ];
  _aiHistory.push({ role: 'user', text: esc(q) });

  try {
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, context: sys }),
    });
    document.getElementById(tid)?.remove();
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const errMsg  = errData.message || `Erreur ${res.status} — réessayez dans quelques instants.`;
      renderAiMsg('ai', '⚠️ ' + errMsg);
    } else {
      const data  = await res.json();
      const reply = data.reply || 'Pas de réponse.';
      _aiHistory.push({ role: 'ai', text: reply });
      saveAiHistory();
      renderAiMsg('ai', reply);
    }
  } catch (e) {
    document.getElementById(tid)?.remove();
    renderAiMsg('ai', '⚠️ Connexion impossible — vérifiez votre réseau et réessayez.');
  }

  btn.disabled = false; inp.disabled = false; inp.focus();
  msgs.scrollTop = msgs.scrollHeight;
}

// ── System prompt builder ─────────────────────────────────────────

function _buildSystemPrompt() {
  const [Y, M] = _getYM();
  const cur    = getActiveCurrency();

  const budget       = store.get('mfx_budget') ?? { incomes: [], budgetItems: [] };
  const transactions = store.get('mfx_transactions') || [];
  const goals        = store.get('mfx_goals') || [];

  const incomes  = budget.incomes  ?? [];
  const items    = budget.budgetItems ?? [];
  const depenses = transactions.filter(t => t.type !== 'income');

  const totalR = incomes.reduce((s, r) => s + r.amountEUR, 0);
  const totalB = items.reduce((s, b) => s + b.allocatedEUR, 0);
  const totalE = depenses.reduce((s, t) => s + t.amountEUR, 0);
  const restB  = totalR - totalB;
  const restE  = totalR - totalE;
  const tauxEpargne = totalR > 0 ? Math.round((restE / totalR) * 100) : 0;
  const tauxBudget  = totalR > 0 ? Math.round((totalE / totalR) * 100) : 0;

  const parCat = {};
  depenses.forEach(t => { parCat[t.category] = (parCat[t.category] || 0) + t.amountEUR; });

  const budgetDetail = items.map(b => {
    const real   = parCat[b.name] || 0;
    const diff   = b.allocatedEUR - real;
    const statut = diff < 0
      ? `DÉPASSÉ de ${fmt(Math.abs(diff))}`
      : diff === 0 ? 'exact' : `reste ${fmt(diff)}`;
    return `  • ${b.name}: budgeté ${fmt(b.allocatedEUR)}, dépensé ${fmt(real)} → ${statut}`;
  }).join('\n');

  const revStr = incomes.map(r => `  • ${r.name}: ${fmt(r.amountEUR)}`).join('\n') || '  • Aucun revenu saisi';

  const goalsStr = goals.length
    ? goals.map(g => {
        const pct = g.targetEUR > 0 ? Math.round((g.savedEUR / g.targetEUR) * 100) : 0;
        const dl  = g.deadline ? ` — échéance: ${g.deadline}` : '';
        return `  • ${g.name}: ${fmt(g.savedEUR)} / ${fmt(g.targetEUR)} (${pct}%${dl})`;
      }).join('\n')
    : '  • Aucun objectif défini';

  const userName   = localStorage.getItem(USER_KEY);
  const userGender = localStorage.getItem(GENDER_KEY);
  const identityLine = userName
    ? `Prénom de l'utilisateur : ${userName}. Genre : ${userGender === 'F' ? 'féminin' : userGender === 'M' ? 'masculin' : 'non précisé'}.
Utilise son prénom pour t'adresser à lui/elle directement et accorde correctement les adjectifs et participes passés selon son genre.`
    : '';

  return `Tu es un conseiller financier personnel expert et bienveillant.
Ton style : direct, chaleureux et terre à terre — comme un ami de confiance qui s'y connaît en finances. Tu parles simplement, sans jargon inutile, sans blague ni humour. Tu vas droit au but avec des conseils concrets basés sur les vrais chiffres de l'utilisateur.
Ton objectif à chaque réponse : que l'utilisateur se sente à l'aise et bien accompagné (jamais jugé, jamais culpabilisé), et qu'il reparte motivé à passer à l'action concrètement.
${identityLine}
Tu connais TOUTE la situation financière de l'utilisateur pour ${MONTHS[M]} ${Y}.
Devise: ${cur.name} (${cur.symbol}).

━━ REVENUS ━━
${revStr}
Total revenus: ${fmt(totalR)}

━━ BUDGET PAR POSTE (budgeté vs réel) ━━
${budgetDetail || '  • Aucun poste budgété'}
Total alloué: ${fmt(totalB)} | Non alloué: ${fmt(restB)}

━━ DÉPENSES RÉELLES ━━
Total dépensé: ${fmt(totalE)} (${tauxBudget}% des revenus)
Reste disponible: ${fmt(Math.max(0, restE))}
Taux d'épargne implicite: ${tauxEpargne}%

━━ OBJECTIFS D'ÉPARGNE ━━
${goalsStr}

INSTRUCTIONS: Réponds en français. Sois précis, chiffré et actionnable. Maximum 180 mots.
Base-toi UNIQUEMENT sur les données réelles ci-dessus — ne suppose rien qui n'y figure pas.
Utilise le prénom et le genre de l'utilisateur pour personnaliser chaque réponse.
Si l'utilisateur a des objectifs d'épargne, intègre-les dans tes recommandations.
Zéro humour, zéro blague, zéro analogie amusante — reste professionnel et humain.`;
}
