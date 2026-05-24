// ═══ Data Management UI — export, import, reset, storage error ═══

// ── Init ──────────────────────────────────────────────────────────

export function initDataManagementUI() {
  window.exportData       = exportData;
  window.importData       = importData;
  window.openResetModal   = openResetModal;
  window.closeResetModal  = closeResetModal;
  window.resetOverlayClick = resetOverlayClick;
  window.resetStep2       = resetStep2;
  window.confirmReset     = confirmReset;
  window.showStorageError = showStorageError;
}

// ── Export ────────────────────────────────────────────────────────

export function exportData() {
  const backup = { _version: 1, _date: new Date().toISOString() };
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && (k.startsWith('monargent') || k.startsWith('myfinanx') || k.startsWith('mfx'))) {
      backup[k] = localStorage.getItem(k);
    }
  }
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `myfinanx-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

// ── Import ────────────────────────────────────────────────────────

export function importData(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const backup = JSON.parse(e.target.result);
      if (typeof backup !== 'object' || Array.isArray(backup)) throw new Error('not-object');
      // Valider : au moins une clé connue avant d'écrire (import atomique)
      const entries = Object.entries(backup).filter(([k]) =>
        k.startsWith('monargent') || k.startsWith('myfinanx') || k.startsWith('mfx')
      );
      if (entries.length === 0) throw new Error('no-valid-keys');
      try {
        entries.forEach(([k, v]) => localStorage.setItem(k, v));
      } catch (storageErr) {
        alert('Espace de stockage insuffisant pour importer les données.');
        return;
      }
      location.reload();
    } catch (err) {
      if (err.message !== 'no-valid-keys') console.warn('[import]', err);
      alert('Fichier invalide.\nUtilise un fichier exporté depuis MyFinanx.');
    }
  };
  reader.readAsText(file);
  const inp = document.getElementById('import-input');
  if (inp) inp.value = '';
}

// ── Reset ─────────────────────────────────────────────────────────

export function openResetModal() {
  if (window.toggleDrawer) window.toggleDrawer(false);
  const s1 = document.getElementById('reset-s1');
  const s2 = document.getElementById('reset-s2');
  if (s1) s1.style.display = '';
  if (s2) s2.style.display = 'none';
  document.getElementById('reset-overlay')?.classList.add('open');
  document.body.style.overflow = 'hidden';
}

export function closeResetModal() {
  document.getElementById('reset-overlay')?.classList.remove('open');
  document.body.style.overflow = '';
}

export function resetOverlayClick(e) {
  if (e.target === document.getElementById('reset-overlay')) closeResetModal();
}

export function resetStep2() {
  const s1 = document.getElementById('reset-s1');
  const s2 = document.getElementById('reset-s2');
  if (s1) s1.style.display = 'none';
  if (s2) s2.style.display = '';
}

export function confirmReset() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && (k.startsWith('monargent') || k.startsWith('myfinanx') || k.startsWith('mfx'))) keys.push(k);
  }
  keys.forEach(k => localStorage.removeItem(k));
  sessionStorage.clear();
  window.location.reload();
}

// ── Storage error toast ───────────────────────────────────────────

export function showStorageError() {
  if (document.getElementById('storage-error-toast')) return;
  const toast = document.createElement('div');
  toast.id = 'storage-error-toast';
  toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#c0392b;color:#fff;padding:10px 18px;border-radius:8px;font-size:14px;z-index:9999;box-shadow:0 2px 8px rgba(0,0,0,.3)';
  toast.textContent = '⚠️ Stockage local plein — libérez de l\'espace ou exportez vos données.';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 6000);
}
