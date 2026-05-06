const KEY      = "__chatstats_history";
const MAX_KEEP = 10;

export function saveSession(S) {
  if (!S.channelInfo || S.total < 5) return;
  try {
    const now       = Date.now();
    const sessDurMs = S.stats.startedAt ? now - S.stats.startedAt : 0;

    // Top category (most time)
    const catMap = {};
    (S.categoryHistory ?? []).forEach((c, i) => {
      const end = S.categoryHistory[i + 1]?.startTs ?? now;
      catMap[c.category] = (catMap[c.category] ?? 0) + (end - c.startTs);
    });
    const topCat = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0] ?? null;

    // Peak moment
    const peak = (S.peaks ?? []).length
      ? S.peaks.reduce((a, b) => b.count > a.count ? b : a)
      : null;

    const session = {
      id:            Date.now(),
      slug:          S.channelInfo.slug,
      displayName:   S.channelInfo.user?.username ?? S.channelInfo.slug,
      streamTitle:   S.channelInfo.streamTitle   ?? null,
      startedAt:     S.stats.startedAt,
      stoppedAt:     now,
      sessionMs:     sessDurMs,
      totalMessages: S.total,
      uniqueUsers:   S.usersMap.size,
      msgsPerMin:    sessDurMs > 0 ? Math.round(S.total / (sessDurMs / 60_000)) : 0,
      topCategory:     topCat ? { name: topCat[0], durationMs: topCat[1] } : null,
      categoryHistory: (S.categoryHistory ?? []).map((c, i) => {
        const end = S.categoryHistory[i + 1]?.startTs ?? now;
        return { category: c.category, startTs: c.startTs, endTs: end, durationMs: end - c.startTs };
      }),
      peakMoment:    peak ? { count: peak.count, ts: peak.ts } : null,
      users: Array.from(S.usersMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 100)
        .map((u) => ({ username: u.username, count: u.count })),
      topEmotes: (S.emoteRanking ?? [])
        .slice(0, 20)
        .map((e) => ({ name: e.name, count: e.count, url: e.url ?? null })),
    };

    const existing = loadSessions();
    const updated  = [session, ...existing].slice(0, MAX_KEEP);
    localStorage.setItem(KEY, JSON.stringify(updated));
  } catch {}
}

export function loadSessions() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function deleteSession(id) {
  try {
    const updated = loadSessions().filter((s) => s.id !== id);
    localStorage.setItem(KEY, JSON.stringify(updated));
  } catch {}
}
