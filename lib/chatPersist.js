// Persist session data across page reloads AND browser closes.
// Uses localStorage (permanent) with a 24h TTL.
// Also saves to sessionStorage as a fast-access cache.

const KEY      = "__chatstats_data";
const VERSION  = 6; // bumped: switched to localStorage + 24h TTL
const MAX_USERS = 10_000;
const TTL_MS   = 24 * 60 * 60 * 1000; // 24 hours

function write(data) {
  const json = JSON.stringify(data);
  try { localStorage.setItem(KEY, json); }   catch {}
  try { sessionStorage.setItem(KEY, json); } catch {}
}

function read() {
  // Try sessionStorage first (faster), fall back to localStorage
  for (const store of [sessionStorage, localStorage]) {
    try {
      const raw = store?.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
  }
  return null;
}

export function persistState(S) {
  try {
    if (!S.channelInfo || S.total === 0) return;

    const now = Date.now();

    const users = Array.from(S.usersMap.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, MAX_USERS)
      .map(([, v]) => {
        let topEmote = null, topCount = 0;
        if (v.emoteCounts?.size) {
          for (const [name, count] of v.emoteCounts) {
            if (count > topCount) { topCount = count; topEmote = [name, count]; }
          }
        }
        return { u: v.username, c: v.count, fs: v.firstSeen, ls: v.lastSeen, te: topEmote, st: v.streak ?? 0 };
      });

    const userTimeMap = Array.from(S.userTimeMap.entries()).map(
      ([bucket, usersSet]) => [bucket, Array.from(usersSet)]
    );

    write({
      v:               VERSION,
      savedAt:         now,
      channelInfo:     S.channelInfo,
      stats:           S.stats,
      backfill:        S.backfill,
      total:           S.total,
      users,
      emoteCount:      Array.from(S.emoteCountMap.entries()),
      timeMap:         Array.from(S.timeMap.entries()),
      userTimeMap,
      messages:        S.messages,
      peakUsers:       S.peakUsers       ?? null,
      quietMoment:     S.quietMoment     ?? null,
      categoryHistory: S.categoryHistory ?? [],
      comboHistory:    S.comboHistory    ?? [],
      peaks:           S.peaks           ?? [],
      titleChanges:    S.titleChanges    ?? [],
    });
  } catch {}
}

export function loadPersistedState() {
  try {
    const data = read();
    if (!data) return null;
    if (data.v !== VERSION) return null;
    if (!data.channelInfo || !data.total) return null;

    // Reject stale data older than TTL
    if (data.savedAt && Date.now() - data.savedAt > TTL_MS) {
      clearPersistedState();
      return null;
    }

    const usersMap = new Map();
    for (const u of data.users ?? []) {
      const emoteCounts = new Map(u.te ? [u.te] : []);
      usersMap.set(u.u, {
        username: u.u, count: u.c, firstSeen: u.fs, lastSeen: u.ls,
        emoteCounts, streak: u.st ?? 0,
      });
    }

    const userTimeMap = new Map();
    for (const [bucket, usernames] of data.userTimeMap ?? []) {
      userTimeMap.set(bucket, new Set(usernames));
    }

    return {
      channelInfo:     data.channelInfo,
      stats:           { ...data.stats, stoppedAt: Date.now() },
      backfill:        { ...data.backfill, active: false },
      total:           data.total,
      usersMap,
      emoteCountMap:   new Map(data.emoteCount ?? []),
      timeMap:         new Map(data.timeMap ?? []),
      userTimeMap,
      messages:        Array.isArray(data.messages) ? data.messages : [],
      peakUsers:       data.peakUsers       ?? null,
      quietMoment:     data.quietMoment     ?? null,
      categoryHistory: Array.isArray(data.categoryHistory) ? data.categoryHistory : [],
      comboHistory:    Array.isArray(data.comboHistory)    ? data.comboHistory    : [],
      peaks:           Array.isArray(data.peaks)           ? data.peaks           : [],
      titleChanges:    Array.isArray(data.titleChanges)    ? data.titleChanges    : [],
    };
  } catch {
    return null;
  }
}

export function clearPersistedState() {
  try { localStorage.removeItem(KEY);   } catch {}
  try { sessionStorage.removeItem(KEY); } catch {}
}
