// Garde-fous partagés par les fonctions serverless (fichier préfixé « _ » : non exposé comme route).

// Hôtes autorisés : production, previews du projet (myfinanx-*.vercel.app), dev local,
// plus les domaines listés dans ALLOWED_ORIGINS (séparés par des virgules).
export function isAllowedHost(host, extra = []) {
  if (!host) return false;
  if (/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) return true;
  if (host === 'myfinanx.vercel.app') return true;
  if (/^myfinanx-[a-z0-9-]+\.vercel\.app$/.test(host)) return true;
  return extra.some(o => { try { return new URL(o).host === host; } catch (e) { return false; } });
}

export function allowedOrigin(req) {
  const extra = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const src = req.headers.origin || req.headers.referer || '';
  let host = '';
  try { host = src ? new URL(src).host : ''; } catch (e) { host = ''; }
  return isAllowedHost(host, extra);
}

// Débit par IP (best-effort : la mémoire est propre à chaque instance)
const _hits = new Map();
export function rateLimited(req, max, windowMs, bucket = 'default') {
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const key = bucket + ':' + ip;
  const now = Date.now();
  const arr = (_hits.get(key) || []).filter(t => now - t < windowMs);
  arr.push(now);
  _hits.set(key, arr);
  if (_hits.size > 5000) _hits.clear();
  return arr.length > max;
}
