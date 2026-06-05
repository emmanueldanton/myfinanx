// Serverless endpoint — programme une notification push personnalisée via OneSignal REST API

// ── Garde-fous : origine autorisée + débit (best-effort, par instance) ──
const _hits = new Map();

function allowedOrigin(req) {
  const extra = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const src = req.headers.origin || req.headers.referer || '';
  let host = '';
  try { host = src ? new URL(src).host : ''; } catch (e) { host = ''; }
  if (!host) return false;
  if (/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) return true;
  if (host.endsWith('.vercel.app')) return true;
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
  if (req.method !== 'POST') return res.status(405).end();

  // Empêche un tiers d'utiliser ce relais pour envoyer des notifs arbitraires
  if (!allowedOrigin(req)) return res.status(403).json({ error: 'FORBIDDEN' });
  if (rateLimited(req, 10, 60000)) return res.status(429).json({ error: 'RATE_LIMITED' });

  const { subscriptionId, title, message, deliverAt } = req.body || {};
  if (!subscriptionId || !message) {
    return res.status(400).json({ error: 'subscriptionId and message are required' });
  }
  // Validation des entrées (format + longueur) pour limiter les abus
  if (typeof subscriptionId !== 'string' || subscriptionId.length > 100 ||
      typeof message !== 'string' || message.length > 400 ||
      (title != null && (typeof title !== 'string' || title.length > 120))) {
    return res.status(400).json({ error: 'INVALID_INPUT' });
  }

  const apiKey = process.env.ONESIGNAL_REST_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ONESIGNAL_REST_API_KEY not configured' });
  }

  const payload = {
    app_id: '72f38150-9fe6-4197-acf3-63278a8a86c9',
    include_subscription_ids: [subscriptionId],
    headings: { en: title || 'MyFinanx' },
    contents: { en: message },
    url: 'https://myfinanx.vercel.app',
  };

  if (deliverAt) payload.send_after = deliverAt;

  try {
    const r = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await r.json();
    return res.status(r.ok ? 200 : r.status).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
