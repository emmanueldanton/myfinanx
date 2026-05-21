export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  const { messages, context } = req.body || {};

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'INVALID_BODY', message: 'messages[] est requis et ne peut pas être vide.' });
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
        max_tokens: 500,
        temperature: 0.7
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
