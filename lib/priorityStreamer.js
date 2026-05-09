const KEY = "__chatstats_priority";

export function setPriority(slug) {
  try { localStorage.setItem(KEY, slug.trim().toLowerCase()); } catch {}
}
export function getPriority() {
  try { return localStorage.getItem(KEY) || null; } catch { return null; }
}
export function clearPriority() {
  try { localStorage.removeItem(KEY); } catch {}
}
