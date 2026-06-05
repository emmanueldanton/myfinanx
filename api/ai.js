// ── Garde-fous : origine autorisée + débit (best-effort, par instance) ──
const _hits = new Map();

function allowedOrigin(req) {
  const extra = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const src = req.headers.origin || req.headers.referer || '';
  let host = '';
  try { host = src ? new URL(src).host : ''; } catch (e) { host = ''; }
  if (!host) return false;
  if (/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) return true;   // dev
  if (host.endsWith('.vercel.app')) return true;                     // prod + previews Vercel
  return extra.some(o => { try { return new URL(o).host === host; } catch (e) { return false; } });
}

function rateLimited(req, max, windowMs) {
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const now = Date.now();
  const arr = (_hits.get(ip) || []).filter(t => now - t < windowMs);
  arr.push(now);
  _hits.set(ip, arr);
  return arr.length > max;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  // Bloque les appels hors de l'app (limite l'abus de la clé Groq depuis d'autres sites)
  if (!allowedOrigin(req)) {
    return res.status(403).json({ error: 'FORBIDDEN', message: 'Origine non autorisée.' });
  }
  if (rateLimited(req, 20, 60000)) {
    return res.status(429).json({ error: 'RATE_LIMITED', message: 'Trop de requêtes — réessaie dans une minute.' });
  }

  const { messages, context, temperature, maxTokens, json } = req.body || {};

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'INVALID_BODY', message: 'messages[] est requis et ne peut pas être vide.' });
  }

  // Plafond de taille — évite les payloads abusifs / coûteux
  if (messages.length > 40 || JSON.stringify(messages).length > 24000) {
    return res.status(413).json({ error: 'PAYLOAD_TOO_LARGE', message: 'Conversation trop longue, réinitialise-la.' });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Clé API non configurée.' });
  }

  // context peut être une string (contexte riche du client) ou un objet structuré
  let systemContent;
  if (typeof context === 'string' && context.trim()) {
    systemContent = context;
  } else {
    const ctx = context || {};
    const budgetList = (ctx.budgetItems || [])
      .map(b => `  - ${b.name} : alloué ${b.allocatedEUR} EUR, dépensé ${b.spentEUR ?? 0} EUR`)
      .join('\n') || '  (aucun poste budgétaire)';
    const goalsList = (ctx.goals || [])
      .map(g => `  - ${g.name} : ${g.savedEUR ?? 0}/${g.targetEUR} EUR${g.deadlineDays != null ? `, échéance dans ${g.deadlineDays}j` : ''}`)
      .join('\n') || '  (aucun objectif)';

    systemContent = `Tu es MyFinanx, un conseiller financier personnel bienveillant. Réponds toujours en français.
Contexte du mois ${ctx.month || 'courant'} :
- Revenus : ${ctx.totalIncomesEUR ?? 0} EUR
- Dépenses réelles : ${ctx.totalExpensesEUR ?? 0} EUR
- Reste non alloué : ${ctx.unallocatedEUR ?? 0} EUR
Postes budgétaires :
${budgetList}
Objectifs d'épargne :
${goalsList}
Donne des conseils concrets, bienveillants et actionnables. Réponds exclusivement en français. Maximum 180 mots.`;
  }

  const systemMessage = { role: 'system', content: systemContent };

  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [systemMessage, ...messages],
        // Paramètres adaptables par appel (greeting court/déterministe vs chat développé), bornés côté serveur
        max_tokens: typeof maxTokens === 'number' ? Math.min(Math.max(maxTokens, 16), 600) : 500,
        temperature: typeof temperature === 'number' ? Math.min(Math.max(temperature, 0), 1) : 0.5,
        // Sortie JSON stricte quand demandé (répartition de budget)
        ...(json ? { response_format: { type: 'json_object' } } : {})
      })
    });

    if (r.status === 429) {
      return res.status(429).json({ error: 'RATE_LIMITED', message: 'Le conseiller IA est temporairement indisponible. Veuillez réessayer dans quelques secondes.' });
    }

    const data = await r.json();
    if (!data.choices?.[0]?.message?.content) {
      return res.status(500).json({ error: 'GROQ_ERROR', message: 'Le conseiller IA est temporairement indisponible. Veuillez réessayer.' });
    }

    const reply = data.choices[0].message.content;
    res.status(200).json({ reply, usage: data.usage });
  } catch (err) {
    console.error('[api/ai] error:', err);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Une erreur inattendue s\'est produite. Veuillez réessayer.' });
  }
}
