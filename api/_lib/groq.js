// Appel Groq avec chaîne de modèles de secours.
// Groq retire régulièrement des modèles (llama-3.3-70b arrêté le 16/08/2026) :
// si un modèle est indisponible, saturé ou retiré, on passe au suivant.

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Réglages propres à chaque modèle. `headroom` : tokens ajoutés pour le raisonnement
// interne, qui est décompté du plafond de complétion.
const PROFILES = {
  'openai/gpt-oss-120b': { params: { reasoning_effort: 'low', include_reasoning: false }, headroom: 1024 },
  'openai/gpt-oss-20b':  { params: { reasoning_effort: 'low', include_reasoning: false }, headroom: 1024 },
  'qwen/qwen3.8-27b':    { params: { reasoning_effort: 'none' }, headroom: 0 },
};

export const TEXT_MODELS   = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'];
export const VISION_MODELS = ['qwen/qwen3.8-27b'];

export function buildBody(model, { messages, maxTokens, temperature, json }) {
  const profile = PROFILES[model] || { params: {}, headroom: 0 };
  return {
    model,
    messages,
    max_completion_tokens: maxTokens + profile.headroom,
    temperature,
    ...profile.params,
    ...(json ? { response_format: { type: 'json_object' } } : {}),
  };
}

// Statuts qui justifient d'essayer le modèle suivant (modèle retiré, inconnu, saturé, en panne).
function shouldFallback(status) {
  return status === 400 || status === 404 || status === 429 || status >= 500;
}

// Renvoie { reply, usage, model } ou lève une erreur { code, status }.
export async function groqChat(models, opts, { apiKey = process.env.GROQ_API_KEY, fetchImpl = fetch } = {}) {
  let last = { code: 'GROQ_ERROR', status: 500 };
  for (const model of models) {
    let r, data;
    try {
      r = await fetchImpl(GROQ_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify(buildBody(model, opts)),
      });
      data = await r.json().catch(() => ({}));
    } catch (e) {
      last = { code: 'GROQ_ERROR', status: 502 };
      continue;
    }
    const content = data?.choices?.[0]?.message?.content;
    if (r.ok && content) return { reply: content, usage: data.usage, model };
    console.error('[groq]', model, r.status, data?.error?.message || 'réponse vide');
    last = { code: r.status === 429 ? 'RATE_LIMITED' : 'GROQ_ERROR', status: r.status };
    // Réponse vide (raisonnement trop long) : on tente aussi le modèle suivant.
    if (!r.ok && !shouldFallback(r.status)) break;
  }
  const err = new Error(last.code);
  err.code = last.code;
  err.status = last.status;
  throw err;
}
