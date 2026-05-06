const KEY = "__chatstats_favorite";

export function setFavorite(slug) {
  try { localStorage.setItem(KEY, slug.trim().toLowerCase()); } catch {}
}

export function getFavorite() {
  try { return localStorage.getItem(KEY) || null; } catch { return null; }
}

export function clearFavorite() {
  try { localStorage.removeItem(KEY); } catch {}
}
