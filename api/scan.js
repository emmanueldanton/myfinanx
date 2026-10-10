import { allowedOrigin, rateLimited } from './_lib/guard.js';
import { groqChat, TEXT_MODELS, VISION_MODELS } from './_lib/groq.js';
import { normalizeScan } from './_lib/scan-normalize.js';

// Lecture d'un ticket, d'une facture ou d'un relevé : photo(s) ou texte extrait d'un PDF.
// Renvoie des opérations PROPOSÉES : l'application les fait valider avant tout ajout.

export const config = { maxDuration: 60 };

const MAX_IMAGES = 3;
const MAX_IMAGE_CHARS = 2_800_000;   // ~2 Mo par image une fois décodée
const MAX_TEXT = 30_000;
const IMAGE_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

export const EXPENSE_CATEGORIES = ['Alimentation','Transport','Logement','Santé','Téléphone','Abonnements','Dette','Scolarité','Famille','Cérémonie','Matériel','Business','Marketing','Loisirs','Imprévu','Autre'];
export const INCOME_CATEGORIES  = ['Salaire','Freelance','Commerce','Business','Loyers','Tontine','Aide famille','Agriculture','Dividendes','Bourse','Pension','Allocations','Stage','Autre'];

export function buildScanPrompt(today, displayCurrency) {
  return `Tu lis des tickets de caisse, factures et relevés bancaires pour une application de budget.
Date du jour : ${today}. Devise habituelle de l'utilisateur : ${displayCurrency || 'inconnue'}.

Règles :
- Ticket de caisse ou facture : UNE seule opération, le TOTAL payé (jamais article par article). Description courte : nom du commerçant puis nature, par exemple "Carrefour, courses".
- Relevé bancaire ou historique de paiements : une opération par ligne. Débit = "expense", crédit = "income". Ignore les lignes de solde (solde précédent, nouveau solde, solde au...) et les totaux : ce ne sont pas des opérations, même si elles sont en colonne crédit.
- description lisible par un humain : nom du commerçant ou de l'organisme en casse normale, sans les préfixes techniques (CB, PRLV, VIR, CARTE, PAIEMENT). Garde la nature de l'opération quand le nom seul ne suffit pas. Exemples : "CB PROSUMA PLATEAU" devient "Prosuma Plateau", "VIR SALAIRE ORANGE CI" devient "Salaire Orange CI", "RETRAIT DAB ADJAME" devient "Retrait d'espèces Adjamé", "PRLV LOYER SCI LES PALMIERS" devient "Loyer SCI Les Palmiers".
- amount : nombre positif, point comme séparateur décimal, sans symbole ni espace.
- date : format YYYY-MM-DD. Si l'année manque, prends celle de la date du jour. Si aucune date, null.
- currency : code ISO 4217 lu sur le document (FCFA ou F CFA = XOF). null si rien n'est indiqué.
- category, pour une dépense, exactement une de : ${EXPENSE_CATEGORIES.join(', ')}.
- category, pour un revenu, exactement une de : ${INCOME_CATEGORIES.join(', ')}.
- Déduis la catégorie de la nature du commerçant : supermarché, épicerie, restaurant rapide = Alimentation ; station-service, carburant, taxi, transport = Transport ; loyer, électricité, eau, gaz = Logement ; pharmacie, clinique = Santé ; opérateur mobile, crédit téléphonique = Téléphone ; télévision, streaming = Abonnements. Retrait d'espèces = Autre.
- N'invente rien : ne retiens que ce qui est lisible. Si le document est illisible ou sans rapport avec de l'argent, renvoie operations vide et explique en une phrase dans "error".

Réponds UNIQUEMENT avec ce JSON :
{"docType":"ticket|facture|releve|autre","merchant":"<nom ou null>","currency":"<ISO ou null>","operations":[{"date":"YYYY-MM-DD","description":"...","amount":0,"type":"expense|income","category":"...","currency":"<ISO ou null>"}],"error":null}`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  if (!allowedOrigin(req)) return res.status(403).json({ error: 'FORBIDDEN', message: 'Origine non autorisée.' });
  if (rateLimited(req, 8, 60000, 'scan')) {
    return res.status(429).json({ error: 'RATE_LIMITED', message: 'Trop de scans d\'affilée, patiente une minute.' });
  }

  const { images, text, today: clientToday, currency } = req.body || {};
  const imgs = Array.isArray(images) ? images : [];
  const txt = typeof text === 'string' ? text.trim() : '';

  if (!imgs.length && !txt) {
    return res.status(400).json({ error: 'INVALID_BODY', message: 'Aucun document reçu.' });
  }
  if (imgs.length > MAX_IMAGES) {
    return res.status(413).json({ error: 'TOO_MANY_IMAGES', message: `${MAX_IMAGES} images maximum par scan.` });
  }
  if (imgs.some(i => typeof i !== 'string' || i.length > MAX_IMAGE_CHARS || !IMAGE_RE.test(i))) {
    return res.status(400).json({ error: 'INVALID_IMAGE', message: 'Image illisible ou trop lourde.' });
  }
  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Clé API non configurée.' });
  }

  // La date du client sert de référence (fuseau de l'utilisateur), bornée à ±1 jour du serveur.
  const serverToday = todayISO();
  const today = /^\d{4}-\d{2}-\d{2}$/.test(clientToday || '') && Math.abs(new Date(clientToday) - new Date(serverToday)) <= 86400000
    ? clientToday : serverToday;
  const displayCurrency = typeof currency === 'string' && /^[A-Z]{3}$/.test(currency) ? currency : null;
  const system = buildScanPrompt(today, displayCurrency);

  const userContent = imgs.length
    ? [{ type: 'text', text: 'Voici le document à lire.' }, ...imgs.map(url => ({ type: 'image_url', image_url: { url } }))]
    : `Voici le texte extrait du document. Une ligne du document par ligne ; les colonnes sont séparées par " | ". Un montant est toujours dans sa propre colonne : ne colle jamais un chiffre du libellé au montant.\n"""\n${txt.slice(0, MAX_TEXT)}\n"""`;

  try {
    const { reply, model } = await groqChat(imgs.length ? VISION_MODELS : TEXT_MODELS, {
      messages: [{ role: 'system', content: system }, { role: 'user', content: userContent }],
      maxTokens: imgs.length ? 1500 : 4000,
      temperature: 0.1,
      json: true,
    }, { maxWaitMs: 20000 });
    let parsed;
    try { parsed = JSON.parse(reply); } catch (e) {
      const m = String(reply).match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : {};
    }
    const result = normalizeScan(parsed, { expenseCategories: EXPENSE_CATEGORIES, incomeCategories: INCOME_CATEGORIES, today });
    res.status(200).json({ ...result, model });
  } catch (err) {
    if (err.code === 'RATE_LIMITED') {
      return res.status(429).json({ error: 'RATE_LIMITED', message: 'Le service de lecture est très sollicité, réessaie dans quelques secondes.' });
    }
    console.error('[api/scan] error:', err);
    res.status(502).json({ error: 'SCAN_ERROR', message: 'La lecture du document a échoué. Réessaie avec une photo plus nette.' });
  }
}
