// ─── STORAGE HELPERS ────────────────────────────────────────────────────────
export const db = {
  async get(key) {
    try {
      const r = await window.storage.get(key, true);
      return r ? JSON.parse(r.value) : null;
    } catch {
      return null;
    }
  },
  async set(key, val) {
    try {
      await window.storage.set(key, JSON.stringify(val), true);
      return true;
    } catch {
      return false;
    }
  },
};
