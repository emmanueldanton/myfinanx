// Serverless endpoint — programme une notification push personnalisée via OneSignal REST API
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { subscriptionId, title, message, deliverAt } = req.body || {};
  if (!subscriptionId || !message) {
    return res.status(400).json({ error: 'subscriptionId and message are required' });
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
