import { allowedOrigin, rateLimited } from './_lib/guard.js';
import { groqChat, TEXT_MODELS } from './_lib/groq.js';

// Cadre imposé par le serveur : la route ne sert que le conseiller financier de l'app,
// même si un client envoie ses propres consignes (évite l'usage de la clé comme LLM gratuit).
export const SERVER_FRAME = `Tu es l'assistant financier intégré à l'application MyFinanx.
Tu ne traites que de finances personnelles : budget, dépenses, revenus, épargne, objectifs, dettes, consommation.
Si on te demande autre chose (code, devoirs, textes sans rapport, etc.), refuse poliment en une phrase et ramène vers les finances.
Réponds en français. N'utilise jamais de tiret cadratin ni de tiret demi-cadratin.`;

const MAX_CONTEXT = 8000;

export function buildSystem(context) {
  let appPart;
  if (typeof context === 'string' && context.trim()) {
    appPart = context.slice(0, MAX_CONTEXT);
  } else {
    const ctx = (context && typeof context === 'object') ? context : {};
    const budgetList = (ctx.budgetItems || [])
      .map(b => `  - ${b.name} : alloué ${b.allocatedEUR} EUR, dépensé ${b.spentEUR ?? 0} EUR`)
      .join('\n') || '  (aucun poste budgétaire)';
    const goalsList = (ctx.goals || [])
      .map(g => `  - ${g.name} : ${g.savedEUR ?? 0}/${g.targetEUR} EUR${g.deadlineDays != null ? `, échéance dans ${g.deadlineDays}j` : ''}`)
      .join('\n') || '  (aucun objectif)';
    appPart = `Contexte du mois ${ctx.month || 'courant'} :
- Revenus : ${ctx.totalIncomesEUR ?? 0} EUR
- Dépenses réelles : ${ctx.totalExpensesEUR ?? 0} EUR
- Reste non alloué : ${ctx.unallocatedEUR ?? 0} EUR
Postes budgétaires :
${budgetList}
Objectifs d'épargne :
${goalsList}
Donne des conseils concrets, bienveillants et actionnables. Maximum 180 mots.`.slice(0, MAX_CONTEXT);
  }
  return `${SERVER_FRAME}\n\nConsignes et données fournies par l'application :\n${appPart}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }
  if (!allowedOrigin(req)) {
    return res.status(403).json({ error: 'FORBIDDEN', message: 'Origine non autorisée.' });
  }
  if (rateLimited(req, 20, 60000, 'ai')) {
    return res.status(429).json({ error: 'RATE_LIMITED', message: 'Trop de requêtes, réessaie dans une minute.' });
  }

  const { messages, context, temperature, maxTokens, json } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'INVALID_BODY', message: 'messages[] est requis et ne peut pas être vide.' });
  }
  if (messages.length > 40 || JSON.stringify(messages).length > 24000) {
    return res.status(413).json({ error: 'PAYLOAD_TOO_LARGE', message: 'Conversation trop longue, réinitialise-la.' });
  }
  // Seuls les rôles utilisateur et assistant viennent du client : le rôle système est réservé au serveur.
  const clean = messages
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map(m => ({ role: m.role, content: m.content }));
  if (!clean.length) {
    return res.status(400).json({ error: 'INVALID_BODY', message: 'Aucun message valide.' });
  }
  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Clé API non configurée.' });
  }

  try {
    const { reply, usage, model } = await groqChat(TEXT_MODELS, {
      messages: [{ role: 'system', content: buildSystem(context) }, ...clean],
      maxTokens: typeof maxTokens === 'number' ? Math.min(Math.max(maxTokens, 16), 600) : 500,
      temperature: typeof temperature === 'number' ? Math.min(Math.max(temperature, 0), 1) : 0.5,
      json: !!json,
    });
    res.status(200).json({ reply, usage, model });
  } catch (err) {
    if (err.code === 'RATE_LIMITED') {
      return res.status(429).json({ error: 'RATE_LIMITED', message: 'Le conseiller IA est très sollicité. Réessaie dans quelques secondes.' });
    }
    console.error('[api/ai] error:', err);
    res.status(502).json({ error: 'GROQ_ERROR', message: 'Le conseiller IA est temporairement indisponible. Réessaie dans un instant.' });
  }
}
