export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { question, context } = req.body || {};
  if (!question) return res.status(400).json({ error: 'question manquante' });

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: 'Clé API non configurée.' });
  }

  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: context || 'Tu es un conseiller financier expert. Réponds en français, concis et avec des conseils actionnables.' },
        { role: 'user',   content: question }
      ],
      max_tokens: 600,
      temperature: 0.7
    })
  });

  const data = await r.json();
  const reply = data.choices?.[0]?.message?.content || 'Pas de réponse.';
  res.status(200).json({ reply });
}
