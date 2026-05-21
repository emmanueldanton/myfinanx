const _state = {};
const _listeners = new Map();

function _notify(key, value) {
  (_listeners.get(key) || []).forEach(fn => fn(value));
}

export const store = {
  get(key) {
    return _state[key];
  },

  set(key, value) {
    _state[key] = value;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        _notify('storageError', { key });
      }
    }
    _notify(key, value);
  },

  load(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        _state[key] = parsed;
        return parsed;
      }
    } catch (_) {}
    _state[key] = fallback;
    return fallback;
  },

  remove(key) {
    delete _state[key];
    localStorage.removeItem(key);
    _notify(key, undefined);
  },

  subscribe(key, fn) {
    if (!_listeners.has(key)) _listeners.set(key, []);
    _listeners.get(key).push(fn);
    return () => {
      const fns = _listeners.get(key) || [];
      _listeners.set(key, fns.filter(f => f !== fn));
    };
  },

  migrate() {
    const prefs = this.load('mfx_prefs', {});
    if (!prefs.schemaVersion) {
      prefs.schemaVersion = '1.0';
      this.set('mfx_prefs', prefs);
    }
  },
};
