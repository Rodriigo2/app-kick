const KEY      = "__chatstats_frequent";
const MAX_KEEP = 8;

export function recordChannel(channelInfo, { increment = true } = {}) {
  if (!channelInfo?.slug) return;
  try {
    const list    = loadFrequent();
    const existing = list.find((c) => c.slug === channelInfo.slug);
    const entry = {
      slug:         channelInfo.slug,
      displayName:  channelInfo.user?.username || channelInfo.slug,
      profilePic:   channelInfo.user?.profilePic ?? null,
      count:        increment ? (existing?.count ?? 0) + 1 : (existing?.count ?? 1),
      lastConnected: Date.now(),
    };
    const updated = [entry, ...list.filter((c) => c.slug !== channelInfo.slug)]
      .sort((a, b) => b.count - a.count)
      .slice(0, MAX_KEEP);
    localStorage.setItem(KEY, JSON.stringify(updated));
  } catch {}
}

export function loadFrequent() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function removeFrequent(slug) {
  try {
    const updated = loadFrequent().filter((c) => c.slug !== slug);
    localStorage.setItem(KEY, JSON.stringify(updated));
  } catch {}
}
