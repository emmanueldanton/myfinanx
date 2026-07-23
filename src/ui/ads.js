// src/ui/ads.js — système de publicités (migré depuis l'inline d'index.html)
const AD_SEEN_KEY = 'myfinanx-ad-last';

// Durées en millisecondes par fréquence
const AD_FREQ_MS = {
  'always'  : 0,
  'session' : null,          // géré via sessionStorage
  'hourly'  : 60 * 60 * 1000,
  'daily'   : 24 * 60 * 60 * 1000,
  '3days'   : 3 * 24 * 60 * 60 * 1000,
  'weekly'  : 7 * 24 * 60 * 60 * 1000,
};

async function loadAd() {
  try {
    const res = await fetch('/ads.json?v=' + Date.now());
    const data = await res.json();
    if (!data.enabled || !data.ads || !data.ads.length) return;

    const freq = data.frequency || 'daily';

    if (freq === 'session') {
      if (sessionStorage.getItem(AD_SEEN_KEY)) return;
    } else if (freq !== 'always') {
      const ms = AD_FREQ_MS[freq];
      if (ms !== undefined) {
        const last = parseInt(localStorage.getItem(AD_SEEN_KEY) || '0', 10);
        if (Date.now() - last < ms) return;
      }
    }

    const ad = data.ads[Math.floor(Math.random() * data.ads.length)];
    const delay = data.delay || 4000;
    setTimeout(() => showAd(ad), delay);
  } catch (e) {}
}

function showAd(ad) {
  const imgWrap = document.getElementById('ad-img-wrap');
  if (ad.img) {
    const img = document.createElement('img');
    img.className = 'ad-img';
    img.src = ad.img;
    img.alt = ad.title || '';
    imgWrap.appendChild(img);
  } else {
    imgWrap.innerHTML = '<div class="ad-img-placeholder">Publicité</div>';
  }
  document.getElementById('ad-title').textContent = ad.title || '';
  document.getElementById('ad-txt').textContent   = ad.body  || '';
  const cta = document.getElementById('ad-cta');
  cta.textContent = ad.cta || 'Voir';
  cta.href = ad.url || '#';
  document.getElementById('ad-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  sessionStorage.setItem(AD_SEEN_KEY, '1');
  localStorage.setItem(AD_SEEN_KEY, Date.now().toString());
}

function closeAd() {
  document.getElementById('ad-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

export function initAds() {
  window.closeAd = closeAd;   // pour onclick="closeAd()" dans le DOM
  loadAd();
}
