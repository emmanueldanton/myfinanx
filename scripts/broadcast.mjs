// ─────────────────────────────────────────────────────────────────────────
// Diffusion d'une notification à TOUS les abonnés (annonce de mise à jour).
//
// La clé secrète OneSignal n'est JAMAIS écrite ici : elle est lue depuis
// l'environnement (process.env.ONESIGNAL_REST_API_KEY). Elle reste chez toi.
//
// Utilisation :
//   1) Mets ta clé dans l'environnement (une seule fois, dans ton terminal) :
//        Windows PowerShell :  $env:ONESIGNAL_REST_API_KEY = "ta_cle_rest"
//        macOS / Linux :       export ONESIGNAL_REST_API_KEY="ta_cle_rest"
//
//   2) TEST d'abord (envoie seulement à un appareil, le tien) :
//        node scripts/broadcast.mjs --test <SUBSCRIPTION_ID>
//      (ton subscription id est visible dans OneSignal, ou via la console de l'app)
//
//   3) DIFFUSION à tous les abonnés (envoi réel, irréversible) :
//        node scripts/broadcast.mjs --all
//
//   Options :
//     --title "..."     remplace le titre
//     --message "..."   remplace le message
//     --when <ISO>      programme l'envoi (sinon : immédiat)
// ─────────────────────────────────────────────────────────────────────────

const APP_ID = '72f38150-9fe6-4197-acf3-63278a8a86c9';

// Segment OneSignal qui cible les abonnés. Selon ta configuration, ce peut être
// "Subscribed Users" (défaut historique) ou "Total Subscriptions".
const SEGMENT = 'Subscribed Users';

// Texte de l'annonce (modifiable ici, ou via --title / --message)
const DEFAULT_TITLE   = 'MyFinanx fait peau neuve ✨';
const DEFAULT_MESSAGE = "Nouveau design, page Statistiques, et saisie des dépenses plus rapide. Ouvre l'app pour découvrir tout ça !";
const CLICK_URL       = 'https://myfinanx.vercel.app';

function arg(name) {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

const key = process.env.ONESIGNAL_REST_API_KEY;
if (!key) {
  console.error('❌ ONESIGNAL_REST_API_KEY absente de l\'environnement. Définis-la puis relance.');
  process.exit(1);
}

const isAll  = process.argv.includes('--all');
const testId = arg('--test');
if (!isAll && !testId) {
  console.error('Précise la cible :\n  --test <subscriptionId>   (envoi à un seul appareil, recommandé pour vérifier)\n  --all                     (diffusion à TOUS les abonnés)');
  process.exit(1);
}

const title   = arg('--title')   ?? DEFAULT_TITLE;
const message = arg('--message') ?? DEFAULT_MESSAGE;
const when    = arg('--when');

const payload = {
  app_id: APP_ID,
  headings: { en: title },
  contents: { en: message },
  url: CLICK_URL,
  ...(testId ? { include_subscription_ids: [testId] } : { included_segments: [SEGMENT] }),
  ...(when ? { send_after: when } : {}),
};

console.log(testId ? `Envoi TEST à l'appareil ${testId}...` : `Diffusion à tous les abonnés (segment "${SEGMENT}")...`);
console.log(`  Titre   : ${title}`);
console.log(`  Message : ${message}`);

const res  = await fetch('https://api.onesignal.com/notifications', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Key ${key}` },
  body: JSON.stringify(payload),
});
const data = await res.json().catch(() => ({}));

if (res.ok && !data.errors) {
  console.log(`✅ Envoyé. id=${data.id ?? '(n/a)'} destinataires=${data.recipients ?? '(n/a)'}`);
} else {
  console.error(`❌ Échec (HTTP ${res.status}) :`, JSON.stringify(data));
  process.exit(1);
}
