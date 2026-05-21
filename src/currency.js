export const CURRENCIES = {
  EUR: { code: 'EUR', symbol: '€',    name: 'Euro',            rate: 1,      flag: '🇪🇺', decimals: 2 },
  USD: { code: 'USD', symbol: '$',    name: 'Dollar US',       rate: 1.08,   flag: '🇺🇸', decimals: 2 },
  GBP: { code: 'GBP', symbol: '£',   name: 'Livre sterling',  rate: 0.856,  flag: '🇬🇧', decimals: 2 },
  CAD: { code: 'CAD', symbol: 'CA$',  name: 'Dollar canadien', rate: 1.47,   flag: '🇨🇦', decimals: 2 },
  XOF: { code: 'XOF', symbol: 'CFA', name: 'Franc CFA',       rate: 655.96, flag: '🌍', decimals: 0 },
  MAD: { code: 'MAD', symbol: 'MAD', name: 'Dirham marocain', rate: 10.82,  flag: '🇲🇦', decimals: 2 },
};

const RATES_CACHE_KEY = 'mfx_rates_cache';
const RATES_TTL_MS = 24 * 60 * 60 * 1000;

let _activeCurrency = 'EUR';

export function setActiveCurrency(code) {
  if (CURRENCIES[code]) _activeCurrency = code;
}

export function getActiveCurrency() {
  return CURRENCIES[_activeCurrency] || CURRENCIES.EUR;
}

export function toDisplay(eurAmount) {
  return eurAmount * getActiveCurrency().rate;
}

export function fromDisplay(amount) {
  const cur = getActiveCurrency();
  const d = cur.decimals;
  return Math.round((amount / cur.rate) * Math.pow(10, d)) / Math.pow(10, d);
}

export function fmt(eurAmount) {
  const cur = getActiveCurrency();
  const val = toDisplay(eurAmount);
  const formatted = val.toLocaleString('fr-FR', {
    minimumFractionDigits: cur.decimals,
    maximumFractionDigits: cur.decimals,
  });
  return formatted + ' ' + cur.symbol;
}

export function fmtInput(eurAmount) {
  const cur = getActiveCurrency();
  return toDisplay(eurAmount).toFixed(cur.decimals);
}

export async function fetchLiveRates() {
  try {
    const cached = JSON.parse(localStorage.getItem(RATES_CACHE_KEY) || 'null');
    if (cached && (Date.now() - cached.timestamp) < RATES_TTL_MS) {
      applyRates(cached.rates);
      return;
    }
    const res = await fetch('https://api.frankfurter.app/latest?from=EUR&to=USD,GBP,CAD,MAD');
    if (!res.ok) return;
    const data = await res.json();
    if (!data.rates) return;
    const cache = { base: 'EUR', timestamp: Date.now(), rates: data.rates };
    try { localStorage.setItem(RATES_CACHE_KEY, JSON.stringify(cache)); } catch (_) {}
    applyRates(data.rates);
  } catch (_) {
    // réseau absent — taux hardcodés conservés
  }
}

function applyRates(rates) {
  ['USD', 'GBP', 'CAD', 'MAD'].forEach(code => {
    if (rates[code]) CURRENCIES[code].rate = rates[code];
  });
}
