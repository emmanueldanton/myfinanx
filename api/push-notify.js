// Serverless endpoint : programme une notification push personnalisée via OneSignal REST API

import { allowedOrigin, rateLimited } from './_lib/guard.js';

const APP_ID = '72f38150-9fe6-4197-acf3-63278a8a86c9';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // Empêche un tiers d'utiliser ce relais pour envoyer des notifs arbitraires
  if (!allowedOrigin(req)) return res.status(403).json({ error: 'FORBIDDEN' });
  if (rateLimited(req, 10, 60000, 'push')) return res.status(429).json({ error: 'RATE_LIMITED' });

  const apiKey = process.env.ONESIGNAL_REST_API_KEY;
  const { subscriptionId, title, message, deliverAt, cancelId } = req.body || {};

  // Annulation d'un rappel programmé (ex. versement du mois déjà fait)
  if (cancelId != null) {
    if (typeof cancelId !== 'string' || !/^[0-9a-f-]{36}$/i.test(cancelId)) {
      return res.status(400).json({ error: 'INVALID_INPUT' });
    }
    if (!apiKey) return res.status(500).json({ error: 'ONESIGNAL_REST_API_KEY not configured' });
    try {
      const r = await fetch(`https://api.onesignal.com/notifications/${cancelId}?app_id=${APP_ID}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Key ${apiKey}` },
      });
      return res.status(r.ok ? 200 : r.status).json({ ok: r.ok });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (!subscriptionId || !message) {
    return res.status(400).json({ error: 'subscriptionId and message are required' });
  }
  // Validation des entrées (format + longueur) pour limiter les abus
  if (typeof subscriptionId !== 'string' || subscriptionId.length > 100 ||
      typeof message !== 'string' || message.length > 400 ||
      (title != null && (typeof title !== 'string' || title.length > 120))) {
    return res.status(400).json({ error: 'INVALID_INPUT' });
  }

  if (!apiKey) {
    return res.status(500).json({ error: 'ONESIGNAL_REST_API_KEY not configured' });
  }

  const payload = {
    app_id: APP_ID,
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
