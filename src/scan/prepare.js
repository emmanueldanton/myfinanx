// ═══ Préparation des documents à scanner, 100 % dans le navigateur ═══
// Photos : redimensionnées et recompressées en JPEG (envoi léger, même en 3G).
// PDF : texte extrait localement si le PDF en contient (relevés, factures numériques),
// sinon les premières pages sont rendues en images (PDF scannés).
// pdf.js n'est chargé qu'au premier PDF : le démarrage de l'app n'est pas alourdi.

const MAX_SIDE = 1600;
const JPEG_QUALITY = 0.8;
const MAX_PDF_PAGES_TEXT = 8;
const MAX_PDF_PAGES_IMG = 3;
const MIN_TEXT_CHARS = 60;

export const MAX_IMAGES = 3;
export const MAX_FILE_BYTES = 15 * 1024 * 1024;

function canvasToJpeg(canvas) {
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

function fitSize(w, h, max = MAX_SIDE) {
  const k = Math.min(1, max / Math.max(w, h));
  return [Math.round(w * k), Math.round(h * k)];
}

async function loadBitmap(file) {
  if ('createImageBitmap' in window) {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) { /* repli ci-dessous */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function imageToDataURL(file) {
  const bmp = await loadBitmap(file);
  const [w, h] = fitSize(bmp.width, bmp.height);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close?.();
  return canvasToJpeg(canvas);
}

let _pdfjs = null;
async function loadPdfJs() {
  if (_pdfjs) return _pdfjs;
  const [lib, worker] = await Promise.all([
    import('pdfjs-dist/build/pdf.min.mjs'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]);
  lib.GlobalWorkerOptions.workerSrc = worker.default;
  _pdfjs = lib;
  return lib;
}

// → { text } si le PDF contient du texte, sinon { images: [dataURL, ...] }
export async function pdfToPayload(file) {
  const pdfjs = await loadPdfJs();
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data, isEvalSupported: false }).promise;
  try {
    const pages = Math.min(pdf.numPages, MAX_PDF_PAGES_TEXT);
    const chunks = [];
    for (let p = 1; p <= pages; p++) {
      const page = await pdf.getPage(p);
      const tc = await page.getTextContent();
      // Reconstitue les lignes : un retour à la ligne quand pdf.js le signale
      chunks.push(tc.items.map(i => (i.str || '') + (i.hasEOL ? '\n' : ' ')).join(''));
    }
    const text = chunks.join('\n').replace(/[ \t]+/g, ' ').trim();
    if (text.replace(/\s/g, '').length >= MIN_TEXT_CHARS) return { text };

    // PDF scanné (image seule) : rendu des premières pages
    const images = [];
    for (let p = 1; p <= Math.min(pdf.numPages, MAX_PDF_PAGES_IMG); p++) {
      const page = await pdf.getPage(p);
      const base = page.getViewport({ scale: 1 });
      const scale = MAX_SIDE / Math.max(base.width, base.height);
      const vp = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(vp.width); canvas.height = Math.round(vp.height);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
      images.push(canvasToJpeg(canvas));
    }
    return { images };
  } finally {
    pdf.destroy();
  }
}

export function isPdf(file) {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '');
}

// Prépare la sélection de l'utilisateur : un PDF, ou jusqu'à 3 photos.
export async function prepareFiles(files) {
  const list = [...files];
  if (!list.length) throw new Error('Aucun fichier choisi.');
  if (list.some(f => f.size > MAX_FILE_BYTES)) throw new Error('Fichier trop lourd (15 Mo maximum).');
  const pdf = list.find(isPdf);
  if (pdf) return pdfToPayload(pdf);
  const imgs = list.filter(f => /^image\//.test(f.type) || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name || ''));
  if (!imgs.length) throw new Error('Choisis une photo (JPG, PNG) ou un PDF.');
  const images = [];
  for (const f of imgs.slice(0, MAX_IMAGES)) images.push(await imageToDataURL(f));
  return { images };
}
