// Module-level singleton that survives Next.js HMR.

import { persistState, loadPersistedState, clearPersistedState } from "./chatPersist.js"; // eslint-disable-line
import { saveSession } from "./sessionHistory.js";
import { recordChannel } from "./frequentChannels.js";

const G = globalThis;

const MAX_MESSAGES   = 200;
const MAX_EMOTE_RANK = 50;

const STOPWORDS = new Set([
  "de","la","el","que","y","en","es","a","se","los","del","las","por","con",
  "para","su","al","un","como","lo","le","una","si","está","son","más","este",
  "ya","me","no","o","pero","mi","te","hay","fue","ser","tiene","han","soy",
  "eres","muy","todo","bien","cuando","eso","esta","yo","tu","tú","él","ella",
  "eso","esto","así","ok","ah","jaja","jajaja","jajajaja","ja","je","re","q",
  "xd","xdd","jeje","lol","gg","pq","xq","k","d","x","b","t","n","s","c",
  "les","nos","sus","era","esa","ese","ni","sin","sobre","también","solo",
  "tan","va","voy","vos","nada","acá","aquí","ahí","sí","https","http","www",
]);

const DEFAULTS = () => ({
  status: "idle",
  _stoppedExplicitly: false, // true after user calls stop(); cleared on connect
  error: null,
  channelInfo: null,
  stats: { totalMessages: 0, uniqueUsers: 0, startedAt: null, stoppedAt: null },
  backfill: { active: false, count: 0, done: false, cappedAt: null, oldestTs: null },
  ranking: [],
  emoteRanking: [],
  timeSeries: [],
  peaks: [],
  titleChanges: [],
  categoryHistory: [],
  categoryStats: [],
  lurkerStats: null,
  userCategoryMap: new Map(),
  emoteTimeMap:    new Map(), // hourBucket → Map<emoteName, count>
  emoteByHour:     [],        // [{ hour, topEmote:{name,url,count}, total }]
  activePoll:       null,
  activePrediction: null, // { title, outcomes:[{id,title,totalPoints,totalUsers,color}], status, lockedAt, createdAt }
  subEvents: [],
  subCount: 0,
  giftCount: 0,
  activeCombo:  null,
  comboHistory: [], // [{ name, url, maxCount, ts }] — best combos of the session
  pinnedMessages:   [], // [{ id, username, content, duration, ts }]
  emoteTags:        {}, // emoteName → string[] (from 7TV API)
  commandFreq:      {}, // !command → count
  kickEmoteMap:     {}, // name → url (built from native Kick emotes seen in messages)
  activeMods:       new Map(),
  peakViewerCount:  0,
  retentionData:    null,
  newViewerStats:   null,
  lastSummary:  null,
  donors:       null,
  // internal
  comboTracker: new Map(), // emoteName → { count, lastTs, users: Set }
  comboSaved:   new Set(), // tracks which combo peaks were already saved to history
  peakUsers:    null, // { min, uniqueUsers } — minute with most unique chatters
  quietMoment:  null, // { min, uniqueUsers } — minute with fewest unique chatters
  trackedUsername: null,
  messages: [],
  emoteMap: {},
  _resumed: false,
  usersMap:      new Map(),
  emoteCountMap: new Map(),
  userTimeMap:   new Map(), // bucketMs → Set<username> (unique chatters per minute)
  seenIds:       new Set(),
  timeMap:       new Map(),
  total:         0,
  dirty:         false,
  pusher:        null,
  channel:       null,
  tick:          null,
  session:       0,
  listeners:     new Set(),
});

if (!G.__chatSession) G.__chatSession = DEFAULTS();
const S = G.__chatSession;

// ── Client-side restore — runs synchronously at module load ──────────────────
// typeof window check separates server (SSR) from client. On the client this
// runs BEFORE React renders, so useState(getSnapshot) already sees restored
// data — no flash of zeros.
G.__persistListenerAdded = G.__persistListenerAdded || false;

function doRestore() {
  if (S._resumed || S.total > 0) return;
  const saved = loadPersistedState();
  if (!saved) return;
  // Generic restore: copy all saved fields into singleton.
  // Non-serializable fields (pusher, channel, etc.) are never in `saved`.
  for (const [key, val] of Object.entries(saved)) {
    S[key] = val;
  }
  S._resumed = true;
  S.dirty    = true;
  flush(); // rebuilds ranking, emoteRanking, timeSeries, categoryStats, etc.
}

// NOTE: doRestore() is intentionally NOT called here at module level.
// Running it synchronously before React's first render causes a server/client
// hydration mismatch (server renders empty state, client sees restored data).
// Instead it is called lazily from getSavedSession() inside useEffect, which
// runs only on the client after React has successfully hydrated.

function ensurePersistSetup() {
  if (typeof window !== "undefined" && !G.__persistListenerAdded) {
    G.__persistListenerAdded = true;

    // Save when page unloads (refresh / tab close), but ONLY if the session
    // was not explicitly stopped. After stop(), S._stoppedExplicitly = true
    // and clearPersistedState() already wiped storage — don't re-save.
    const saveOnUnload = () => {
      if (S.total > 0 && !S._stoppedExplicitly) persistState(S);
    };
    window.addEventListener("beforeunload",    saveOnUnload);
    window.addEventListener("pagehide",        saveOnUnload);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) saveOnUnload();
    });

    // Periodic save while connected (belt-and-suspenders).
    setInterval(() => {
      if (S.status === "connected" && S.total > 0 && !S._stoppedExplicitly) persistState(S);
    }, 30_000);
  }
}

function restoreIfNeeded() {
  doRestore(); // no-op if already restored
}

// BroadcastChannel: share ranking with overlay tabs.
G.__rankingChannel = G.__rankingChannel || null;

function getRankingChannel() {
  if (typeof window === "undefined") return null;
  if (!G.__rankingChannel) {
    G.__rankingChannel = new BroadcastChannel("chatstats_ranking");
    // Respond to data requests from overlay tabs
    G.__rankingChannel.onmessage = (e) => {
      if (e.data?.type === "request") broadcastRanking();
    };
  }
  return G.__rankingChannel;
}

function broadcastRanking() {
  const ch = getRankingChannel();
  if (!ch || S.ranking.length === 0) return;
  ch.postMessage({
    type:    "ranking",
    ranking: S.ranking.slice(0, 20).map((u) => ({ username: u.username, count: u.count, streak: u.streak ?? 0 })),
    total:   S.total,
    channel: S.channelInfo?.user?.username || S.channelInfo?.slug || "",
  });
}

function notify() {
  for (const fn of S.listeners) fn();
}

export function subscribe(fn) {
  S.listeners.add(fn);
  return () => S.listeners.delete(fn);
}

export function getSnapshot() {
  return {
    status:       S.status,
    error:        S.error,
    channelInfo:  S.channelInfo,
    stats:        S.stats,
    backfill:     S.backfill,
    ranking:      S.ranking,
    emoteRanking: S.emoteRanking,
    timeSeries:   S.timeSeries,
    peaks:           S.peaks,
    titleChanges:    S.titleChanges,
    categoryHistory: S.categoryHistory,
    categoryStats:   S.categoryStats,
    emoteByHour:     S.emoteByHour,
    lurkerStats:      S.lurkerStats,
    activePoll:       S.activePoll,
    activePrediction: S.activePrediction,
    subEvents:       S.subEvents,
    subCount:        S.subCount,
    giftCount:       S.giftCount,
    activeCombo:  S.activeCombo,
    comboHistory: S.comboHistory,
    pinnedMessages:  S.pinnedMessages,
    activeMods:      [...S.activeMods.values()].sort((a, b) => b.count - a.count),
    topCommands:     Object.entries(S.commandFreq).sort((a,b) => b[1]-a[1]).slice(0,15).map(([cmd,count]) => ({ cmd, count })),
    peakViewerCount: S.peakViewerCount,
    retentionData:   S.retentionData,
    newViewerStats: S.newViewerStats,
    lastSummary:  S.lastSummary,
    donors:          S.donors,
    peakUsers:       S.peakUsers,
    quietMoment:     S.quietMoment,
    trackedUsername: S.trackedUsername,
    messages:     S.messages,
    emoteMap:     S.emoteMap,
    kickEmoteMap: S.kickEmoteMap,
  };
}

function setStatus(v)     { S.status = v;                                                  notify(); }
function setError(v)      { S.error  = v;                                                  notify(); }
function setChannelInfo(v){ S.channelInfo = v;                                             notify(); }
function setStats(fn)     { S.stats    = fn(S.stats);                                     notify(); }
function setBackfill(fn)  { S.backfill = typeof fn === "function" ? fn(S.backfill) : fn;  notify(); }
function setRanking(v)    { S.ranking  = v;                                               notify(); }

const MIN_MS          = 60_000;
const HOUR_MS         = 3_600_000;
const MAX_TS_BUCKETS  = 120;
const KICK_EMOTE_RE   = /\[emote:(\d+):([^\]]+)\]/g;

function extractEmotes(content) {
  const found = [];
  if (!content) return found;
  KICK_EMOTE_RE.lastIndex = 0;
  let m;
  while ((m = KICK_EMOTE_RE.exec(content)) !== null) {
    found.push({ name: m[2], url: `https://files.kick.com/emotes/${m[1]}/fullsize` });
  }
  const stripped = content.replace(/\[emote:\d+:[^\]]+\]/g, " ");
  for (const tok of stripped.split(/\s+/)) {
    if (!tok) continue;
    const url = S.emoteMap[tok];
    if (url) found.push({ name: tok, url });
  }
  return found;
}

const USER_MSG_CAP   = 2000;
const COMBO_MIN = 5; // minimum consecutive uses to show combo

function resolveEmoteUrl(name, kickId) {
  if (kickId) return `https://files.kick.com/emotes/${kickId}/fullsize`;
  // Case-insensitive lookup in emoteMap
  if (S.emoteMap[name]) return S.emoteMap[name];
  const key = Object.keys(S.emoteMap).find(k => k.toLowerCase() === name.toLowerCase());
  return key ? S.emoteMap[key] : null;
}

function detectCombo(username, content) {
  if (!content) return;
  const now = Date.now();

  // Extract ONLY emotes from the message
  const kickEmotes  = [...content.matchAll(/\[emote:(\d+):([^\]]+)\]/g)]
    .map(m => ({ name: m[2], kickId: m[1] }));
  const sevenTvEmotes = content.split(/\s+/)
    .filter(w => w && S.emoteMap[w])
    .map(w => ({ name: w, kickId: null }));

  const allEmotes = [...kickEmotes, ...sevenTvEmotes];

  // Check if message is ONLY one unique emote (pure emote message)
  const textOnly  = content.replace(/\[emote:\d+:[^\]]+\]/g, "").replace(/\S+/g, w => S.emoteMap[w] ? "" : w).trim();
  const hasText   = textOnly.length > 0;
  const uniqueEmoteNames = new Set(allEmotes.map(e => e.name.toLowerCase()));
  const isSingleEmote = !hasText && uniqueEmoteNames.size === 1;

  const prev = S.activeCombo;

  if (!isSingleEmote || allEmotes.length === 0) {
    // Text message or mixed content — freeze count but keep visible for 3s
    if (prev && !prev.dying) {
      S.activeCombo = { ...prev, dying: true };
      S.comboTracker.clear();
      notify();
      setTimeout(() => {
        if (S.activeCombo?.dying) { S.activeCombo = null; notify(); }
      }, 3000);
    }
    return;
  }

  const emoteName = allEmotes[0].name;
  const emoteId   = allEmotes[0].kickId;
  const emoteLower = emoteName.toLowerCase();

  // Different emote from current combo — freeze and start fresh after delay
  if (prev && prev.name.toLowerCase() !== emoteLower) {
    if (!prev.dying) {
      S.activeCombo = { ...prev, dying: true };
      notify();
      setTimeout(() => {
        if (S.activeCombo?.dying) { S.activeCombo = null; notify(); }
      }, 3000);
    }
    S.comboTracker.clear();
  }

  // Increment combo for this emote
  let entry = S.comboTracker.get(emoteLower);
  if (!entry) {
    entry = { count: 0, users: new Set(), url: resolveEmoteUrl(emoteName, emoteId), name: emoteName };
    S.comboTracker.set(emoteLower, entry);
  }
  entry.count++;
  entry.users.add(username);
  if (!entry.url) entry.url = resolveEmoteUrl(emoteName, emoteId);

  if (entry.count >= COMBO_MIN) {
    S.activeCombo = {
      name:    entry.name,
      count:   entry.count,
      url:     entry.url,
      startTs: prev?.name?.toLowerCase() === emoteLower ? (prev.startTs ?? now) : now,
    };

    // Save milestone to history every 10 from COMBO_MIN
    const milestone = (entry.count - COMBO_MIN) % 10 === 0;
    const comboKey  = `${emoteLower}-${entry.count}`;
    if (milestone && !S.comboSaved.has(comboKey)) {
      S.comboSaved.add(comboKey);
      const existingIdx = S.comboHistory.findIndex(c => c.name.toLowerCase() === emoteLower);
      const hist = { name: entry.name, url: entry.url, maxCount: entry.count, ts: now };
      if (existingIdx >= 0 && entry.count > S.comboHistory[existingIdx].maxCount) {
        S.comboHistory = S.comboHistory.map((c, i) => i === existingIdx ? hist : c);
      } else if (existingIdx < 0) {
        S.comboHistory = [...S.comboHistory, hist];
      }
    }
    notify();
  }
}


function countMessage(username, ts, content) {
  const now = ts ?? Date.now();
  let user = S.usersMap.get(username);
  if (user) {
    user.count += 1;
    if (now >= user.lastSeen) {
      user.lastSeen = now;
      if (content) user.lastMessage = content;
    }
    // Store recent messages for live messages only (ts === null means live)
    if (!ts && content) {
      if (!user.recentMsgs) user.recentMsgs = [];
      user.recentMsgs.push({ content, ts: now });
      if (user.recentMsgs.length > USER_MSG_CAP) user.recentMsgs.shift();
    }
  } else {
    user = {
      username, count: 1, firstSeen: now, lastSeen: now,
      lastMessage: content ?? "", emoteCounts: new Map(),
      recentMsgs: (!ts && content) ? [{ content, ts: now }] : [],
      activeMins: new Set(), // set of minute-bucket timestamps when user was active
    };
    S.usersMap.set(username, user);
  }
  S.total += 1;
  const bucket = Math.floor(now / MIN_MS) * MIN_MS;
  S.timeMap.set(bucket, (S.timeMap.get(bucket) ?? 0) + 1);
  if (!user.activeMins) user.activeMins = new Set();
  user.activeMins.add(bucket);

  // Track per-category message counts
  const currentCat = (() => {
    // Find category active at timestamp `now`
    for (let i = S.categoryHistory.length - 1; i >= 0; i--) {
      if (now >= S.categoryHistory[i].startTs) return S.categoryHistory[i].category;
    }
    return null;
  })();
  if (currentCat) {
    if (!S.userCategoryMap.has(username)) S.userCategoryMap.set(username, new Map());
    const catMap = S.userCategoryMap.get(username);
    catMap.set(currentCat, (catMap.get(currentCat) ?? 0) + 1);
  }
  // Track unique chatters per minute
  if (!S.userTimeMap.has(bucket)) S.userTimeMap.set(bucket, new Set());
  S.userTimeMap.get(bucket).add(username);
  if (content) {
    const hourBucket = Math.floor(now / HOUR_MS) * HOUR_MS;
    for (const { name } of extractEmotes(content)) {
      S.emoteCountMap.set(name, (S.emoteCountMap.get(name) ?? 0) + 1);
      user.emoteCounts.set(name, (user.emoteCounts.get(name) ?? 0) + 1);
      if (!S.emoteTimeMap.has(hourBucket)) S.emoteTimeMap.set(hourBucket, new Map());
      const hm = S.emoteTimeMap.get(hourBucket);
      hm.set(name, (hm.get(name) ?? 0) + 1);
    }
  }
  S.dirty = true;
}

let _flushTick = 0;
const PERSIST_EVERY  = 10; // save every 10 flushes = ~10 seconds
const PEAK_THRESHOLD = 2.5; // current bucket must be >2.5x rolling avg to flag
const PEAK_MIN_COUNT = 15;  // minimum messages in a bucket to consider a peak

function flush() {
  if (!S.dirty) return;
  S.dirty = false;

  // ── Streak calculation ────────────────────────────────────────────────────
  // A streak is the number of consecutive minutes in which the user sent at
  // least one message, counted backwards from the most recent minute bucket.
  const allBuckets = Array.from(S.timeMap.keys()).sort((a, b) => a - b);
  const latestBucket = allBuckets[allBuckets.length - 1] ?? 0;

  for (const user of S.usersMap.values()) {
    let streak = 0;
    let bucket = latestBucket;
    while (bucket > 0 && S.userTimeMap.get(bucket)?.has(user.username)) {
      streak++;
      bucket -= MIN_MS;
    }
    user.streak = streak;
  }

  // Compute viewer scores
  for (const user of S.usersMap.values()) {
    user.score = computeViewerScore(user);
  }

  S.ranking = Array.from(S.usersMap.values()).sort(
    (a, b) => b.count - a.count || a.username.localeCompare(b.username)
  );
  S.stats = { ...S.stats, totalMessages: S.total, uniqueUsers: S.usersMap.size };

  const tsEntries = Array.from(S.timeMap.entries()).sort((a, b) => a[0] - b[0]);
  S.timeSeries = tsEntries.slice(-MAX_TS_BUCKETS).map(([min, count]) => ({ min, count }));

  // ── Emotes por hora ──────────────────────────────────────────────────────
  S.emoteByHour = Array.from(S.emoteTimeMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([hour, countMap]) => {
      const sorted = Array.from(countMap.entries()).sort((a, b) => b[1] - a[1]);
      const [topName, topCount] = sorted[0] ?? [null, 0];
      const total = sorted.reduce((s, [, c]) => s + c, 0);
      return {
        hour,
        total,
        topEmote: topName ? { name: topName, count: topCount, url: S.emoteMap[topName] ?? null } : null,
        top5: sorted.slice(0, 5).map(([name, count]) => ({ name, count, url: S.emoteMap[name] ?? null })),
      };
    });

  S.emoteRanking = Array.from(S.emoteCountMap.entries())
    .sort((a, b) => b[1] - a[1]).slice(0, MAX_EMOTE_RANK)
    .map(([name, count]) => ({ name, url: S.emoteMap[name] ?? null, count }));


  // ── Lurker & engagement stats ─────────────────────────────────────────────
  {
    const viewers = S.channelInfo?.viewerCount ?? 0;

    // Active chatters = wrote in the last 5 minutes (compares fairly with current viewers)
    const now5min   = Date.now() - 5 * 60_000;
    const recentBuckets = new Set(
      Array.from(S.timeMap.keys()).filter(b => b >= now5min)
    );
    let recentChatters = 0;
    for (const [bucket, users] of S.userTimeMap) {
      if (recentBuckets.has(bucket)) recentChatters = Math.max(recentChatters, users.size);
    }
    // Fallback: if no recent data, use last known bucket
    if (recentChatters === 0 && S.userTimeMap.size > 0) {
      const lastBucket = Math.max(...S.userTimeMap.keys());
      recentChatters = S.userTimeMap.get(lastBucket)?.size ?? 0;
    }

    const chatters = recentChatters;
    const lurkers  = viewers > chatters ? viewers - chatters : 0;

    // Classify ALL session chatters by activity level (for breakdown)
    let oneTime = 0, casual = 0, regular = 0, top = 0;
    for (const u of S.usersMap.values()) {
      if (u.count === 1)       oneTime += 1;
      else if (u.count <= 5)   casual  += 1;
      else if (u.count <= 20)  regular += 1;
      else                     top     += 1;
    }

    S.lurkerStats = {
      viewers,
      chatters,
      lurkers,
      lurkerRate:      viewers > 0 ? Math.round((lurkers  / viewers) * 100) : 0,
      engagementRate:  viewers > 0 ? Math.round((chatters / viewers) * 100) : 0,
      oneTime,  // said exactly 1 thing
      casual,   // 2-5 messages
      regular,  // 6-20 messages
      top,      // 21+ messages
    };
  }

  // ── Category activity stats ───────────────────────────────────────────────
  if (S.categoryHistory.length > 0) {
    const now     = Date.now();
    const catData = {};
    S.categoryHistory.forEach((c, i) => {
      const endTs = S.categoryHistory[i + 1]?.startTs ?? now;
      if (!catData[c.category]) catData[c.category] = { msgs: 0, userMins: 0, buckets: 0 };
      // Sum all minute buckets within this category's time range
      for (const [bucket, msgCount] of S.timeMap) {
        if (bucket >= c.startTs && bucket < endTs) {
          catData[c.category].msgs     += msgCount;
          catData[c.category].userMins += (S.userTimeMap.get(bucket)?.size ?? 0);
          catData[c.category].buckets  += 1;
        }
      }
    });
    S.categoryStats = Object.entries(catData).map(([category, d]) => {
      // Top 5 users by messages in this specific category
      const topUsers = Array.from(S.userCategoryMap.entries())
        .map(([username, catMap]) => ({ username, count: catMap.get(category) ?? 0 }))
        .filter((u) => u.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      return {
        category,
        totalMessages:  d.msgs,
        avgMsgsPerMin:  d.buckets > 0 ? Math.round(d.msgs / d.buckets) : 0,
        avgUsersPerMin: d.buckets > 0 ? Math.round(d.userMins / d.buckets) : 0,
        totalMinutes:   d.buckets,
        topUsers,
      };
    }).sort((a, b) => b.totalMessages - a.totalMessages);
  }

  // ── Unique chatters per minute (peak & quiet) ──────────────────────────────
  {
    const userSeries = Array.from(S.userTimeMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([min, users]) => ({ min, uniqueUsers: users.size }))
      .filter((b) => b.uniqueUsers > 0);

    // Track peak viewer count from channelInfo
    const vc = S.channelInfo?.viewerCount;
    if (vc > 0 && vc > S.peakViewerCount) S.peakViewerCount = vc;

    if (userSeries.length > 0) {
      S.peakUsers   = userSeries.reduce((a, b) => b.uniqueUsers > a.uniqueUsers ? b : a);
      S.quietMoment = userSeries.length > 1
        ? userSeries.reduce((a, b) => b.uniqueUsers < a.uniqueUsers ? b : a)
        : null;
    }
  }

  // ── Retention from peak ───────────────────────────────────────────────────
  // Finds the peak chatter moment, takes those chatters as the base cohort,
  // and measures how many remain active at each subsequent point.
  {
    const WINDOW_MS = 10 * 60_000; // "active" = wrote in last 10 min
    const SAMPLE_MS =  3 * 60_000; // sample every 3 min
    const allBuckets = Array.from(S.timeMap.keys()).sort((a, b) => a - b);

    if (allBuckets.length >= 10) {
      // 1. Find peak bucket — most unique chatters active simultaneously
      let peakBucket = allBuckets[0];
      let peakCount  = 0;
      for (const b of allBuckets) {
        const count = S.userTimeMap.get(b)?.size ?? 0;
        if (count > peakCount) { peakCount = count; peakBucket = b; }
      }

      // 2. Build peak cohort — users active during the peak window
      const peakCohort = new Set();
      for (const [b, users] of S.userTimeMap) {
        if (b >= peakBucket - WINDOW_MS && b <= peakBucket) {
          for (const u of users) peakCohort.add(u);
        }
      }

      if (peakCohort.size < 5) { S.retentionData = null; return; }

      // 3. Buckets AFTER peak only
      const postPeak = allBuckets.filter(b => b >= peakBucket);
      const sampled  = postPeak.filter((b, i) => {
        const prev = postPeak[i - 1];
        return !prev || b - prev >= SAMPLE_MS || i === postPeak.length - 1;
      });

      if (sampled.length < 2) { S.retentionData = null; return; }

      // 4. For each sample, count how many peak chatters are still active
      const series = sampled.map(bucket => {
        let active = 0;
        for (const username of peakCohort) {
          const u = S.usersMap.get(username);
          if (!u) continue;
          const mins = u.activeMins ?? new Set();
          for (const m of mins) {
            if (m >= bucket - WINDOW_MS && m <= bucket) { active++; break; }
          }
        }
        const dropped  = peakCohort.size - active;
        const activePct = Math.round((active / peakCohort.size) * 100);
        return { ts: bucket, total: peakCohort.size, active, dropped, activePct };
      });

      const last  = series[series.length - 1];
      const prev3 = series[series.length - 3];
      const trend = prev3 ? last.activePct - prev3.activePct : 0;

      S.retentionData = {
        peakBucket,
        peakCount:      peakCohort.size,
        currentActive:  last.active,
        currentDropped: last.dropped,
        activePct:      last.activePct,
        trend,
        series,
      };
    } else {
      S.retentionData = null;
    }
  }

  // ── New viewer stats ──────────────────────────────────────────────────────
  {
    const BUCKET_MS = 5 * 60_000;
    const allUsers  = Array.from(S.usersMap.values());
    const bucketMap = new Map();

    for (const u of allUsers) {
      const b = Math.floor(u.firstSeen / BUCKET_MS) * BUCKET_MS;
      if (!bucketMap.has(b)) bucketMap.set(b, { newCount: 0, engaged: 0 });
      const entry = bucketMap.get(b);
      entry.newCount++;
      if (u.count > 1) entry.engaged++;
    }

    const series = [...bucketMap.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([ts, d]) => ({
        ts,
        newCount:    d.newCount,
        engaged:     d.engaged,
        engagedPct:  d.newCount > 0 ? Math.round((d.engaged / d.newCount) * 100) : 0,
      }));

    const totalNew     = allUsers.length;
    const totalEngaged = allUsers.filter((u) => u.count > 1).length;
    S.newViewerStats = totalNew >= 5 ? {
      totalNew,
      totalEngaged,
      engagedPct: Math.round((totalEngaged / totalNew) * 100),
      series,
    } : null;
  }

  // ── Peak detection ──────────────────────────────────────────────────────────
  if (tsEntries.length >= 5) {
    const last    = tsEntries[tsEntries.length - 1];
    const window4 = tsEntries.slice(-5, -1).map(([, c]) => c);
    const avg     = window4.reduce((a, b) => a + b, 0) / window4.length;
    const cur     = last[1];
    if (cur >= PEAK_MIN_COUNT && avg > 0 && cur / avg >= PEAK_THRESHOLD) {
      const peakTs = last[0];
      const alreadyLogged = S.peaks.some((p) => p.ts === peakTs);
      if (!alreadyLogged) {
        const uniqueUsers = S.userTimeMap.get(peakTs)?.size ?? 0;
        S.peaks = [...S.peaks, { ts: peakTs, count: cur, avg: Math.round(avg), uniqueUsers }];
      }
    }
  }

  notify();
  broadcastRanking(); // push to overlay tabs via BroadcastChannel

  if (S.status === "connected" && S.total > 0) {
    _flushTick = (_flushTick + 1) % PERSIST_EVERY;
    if (_flushTick === 0) persistState(S);
  }
}

// Composite score: messages (weight 1) + active minutes (×3) + streak (×8) + unique emotes (×2)
// Normalized to 0–1000.
function computeViewerScore(user) {
  const msgs        = user.count ?? 0;
  const activeMin   = user.activeMins?.size ?? 0;
  const streak      = user.streak ?? 0;
  const uniqueEmotes = user.emoteCounts?.size ?? 0;
  return msgs * 1 + activeMin * 3 + streak * 8 + uniqueEmotes * 2;
}

export function getUserJourney(username) {
  const user = S.usersMap.get(username);
  if (!user) return null;
  const allBuckets = Array.from(S.timeMap.keys()).sort((a, b) => a - b);
  if (!allBuckets.length) return null;
  const activeMins = user.activeMins ?? new Set();
  return {
    buckets:  allBuckets,
    active:   allBuckets.map((b) => activeMins.has(b)),
    totalMin: allBuckets.length,
    activeMin: activeMins.size,
    score:    computeViewerScore(user),
  };
}

export function getUserTopEmote(username) {
  const user = S.usersMap.get(username);
  if (!user?.emoteCounts?.size) return null;
  let topName = null, topCount = 0;
  for (const [name, count] of user.emoteCounts) {
    if (count > topCount) { topCount = count; topName = name; }
  }
  if (!topName) return null;
  return { name: topName, count: topCount, url: S.emoteMap[topName] ?? null };
}

export function getUserLastMessage(username) {
  return S.usersMap.get(username)?.lastMessage ?? null;
}

export function getUserGiftCount(username) {
  if (!username) return 0;
  return S.subEvents
    .filter((e) => e.type === "gift" && e.gifter?.toLowerCase() === username.toLowerCase())
    .reduce((sum, e) => sum + (e.quantity ?? 1), 0);
}

// Refresh channel metadata (title, tags, viewers, category) without
// touching the Pusher connection or any accumulated session data.
export async function refreshChannelInfo() {
  const slug = S.channelInfo?.slug;
  if (!slug || slug.startsWith("chatroom-")) return;
  try {
    const res  = await fetch(`/api/channel/${encodeURIComponent(slug)}?fresh=1`);
    const body = await res.json();
    if (!res.ok || !body.chatroomId) return;

    const now = Date.now();
    // Detect title change
    const prevTitle    = S.channelInfo?.streamTitle;
    const nextTitle    = body.streamTitle;
    if (prevTitle && nextTitle && prevTitle !== nextTitle) {
      S.titleChanges = [...S.titleChanges, { from: prevTitle, to: nextTitle, ts: now }];
    }
    // Detect category change
    const prevCat = S.channelInfo?.streamCategory;
    const nextCat = body.streamCategory;
    if (nextCat && prevCat !== nextCat) {
      S.categoryHistory = [...S.categoryHistory, { category: nextCat, startTs: now }];
    }

    S.channelInfo = { ...S.channelInfo, ...body };
    notify();
  } catch {}
}

export function trackUser(username) {
  S.trackedUsername = username || null;
  notify();
}

export function getTrackedUserData() {
  const username = S.trackedUsername;
  if (!username) return null;
  const user = S.usersMap.get(username);
  if (!user) return null;
  const rank = S.ranking.findIndex((u) => u.username === username) + 1;
  const durationMin = (user.lastSeen - user.firstSeen) / 60_000;
  const msgsPerMin  = durationMin > 0.5 ? (user.count / durationMin) : null;
  let topEmote = null, topCount = 0;
  for (const [name, count] of (user.emoteCounts ?? [])) {
    if (count > topCount) { topCount = count; topEmote = { name, count, url: S.emoteMap[name] ?? null }; }
  }
  return {
    username:  user.username,
    rank:      rank || null,
    count:     user.count,
    firstSeen: user.firstSeen,
    lastSeen:  user.lastSeen,
    lastMessage: user.lastMessage,
    recentMsgs: user.recentMsgs ?? [],
    msgsPerMin,
    topEmote,
    pct: S.total > 0 ? (user.count / S.total) * 100 : 0,
  };
}

function cleanup() {
  S.session += 1;
  if (S.tick) { clearInterval(S.tick); S.tick = null; }
  if (S.channel) { try { S.channel.unbind_all(); } catch {} }
  if (S.pusher) {
    try { if (S.channel) S.pusher.unsubscribe(S.channel.name); } catch {}
    try { S.pusher.connection.unbind_all(); } catch {}
    try { S.pusher.disconnect(); } catch {}
  }
  S.channel = null;
  S.pusher  = null;
}

async function fetchLeaderboard(channelId, slug) {
  if (!channelId && !slug) return;
  try {
    const params = new URLSearchParams();
    if (channelId) params.set("channelId", channelId);
    if (slug)      params.set("slug", slug);
    const res = await fetch(`/api/leaderboard?${params}`);
    if (!res.ok) return;
    const data = await res.json();
    S.donors = data;
    notify();
  } catch {}
}

async function fetchEmotes(kickUserId, slug) {
  try {
    const params = new URLSearchParams();
    if (kickUserId) params.set("kickUserId", kickUserId);
    if (slug)       params.set("slug", slug);
    const res = await fetch(`/api/emotes?${params}`);
    if (!res.ok) return;
    const data = await res.json();
    if (data?.emotes) {
      S.emoteMap  = data.emotes;
      S.emoteTags = data.tags ?? {};
      notify();
    }
  } catch {}
}

// ─── Backfill ─────────────────────────────────────────────────────────────────

const BACKFILL_MAX_BATCHES  = 30;
const BACKFILL_MAX_MESSAGES = 12000;

async function runBackfill(chatroomId, liveStartedAt, mySession) {
  setBackfill({ active: true, count: S.backfill.count, done: false, cappedAt: null, oldestTs: S.backfill.oldestTs });
  let cursor   = null;
  let batches  = 0;
  let count    = S.backfill.count ?? 0; // continue from restored count
  let cappedAt = null;
  let oldestTs = S.backfill.oldestTs ?? null;

  while (true) {
    if (S.session !== mySession) return;
    if (batches >= BACKFILL_MAX_BATCHES)  { cappedAt = "pages";    break; }
    if (count   >= BACKFILL_MAX_MESSAGES) { cappedAt = "messages"; break; }

    let data;
    try {
      const url = `/api/history?chatroomId=${chatroomId}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) break;
      data = await res.json();
    } catch { break; }

    if (!data?.messages?.length) break;

    let reachedStart = false;
    for (const m of data.messages) {
      if (m.type && m.type !== "message") continue;
      const username = m.sender?.username;
      if (!username) continue;
      const ts = m.created_at ? Date.parse(m.created_at) : null;
      if (liveStartedAt && ts !== null && ts < liveStartedAt) { reachedStart = true; continue; }
      if (S.seenIds.has(m.id)) continue;
      S.seenIds.add(m.id);
      countMessage(username, ts, m.content ?? "");
      count += 1;
      if (ts && (oldestTs === null || ts < oldestTs)) oldestTs = ts;
    }

    batches += 1;
    cursor = data.cursor || null;
    flush();
    setBackfill({ active: true, count, done: false, cappedAt: null, oldestTs });
    if (reachedStart || !cursor) break;
  }

  if (S.session !== mySession) return;
  flush();
  setBackfill({ active: false, count, done: true, cappedAt, oldestTs });
}

// ─── Public actions ───────────────────────────────────────────────────────────

const KICK_PUSHER_KEY     = "32cbd69e4b950bf97679";
const KICK_PUSHER_CLUSTER = "us2";

export async function connect(input) {
  const raw = (input || "").trim();
  if (!raw) { setError("Ingresá un canal o un chatroom_id"); setStatus("error"); return; }

  // Guaranteed browser context — restore persisted data and register beforeunload.
  restoreIfNeeded();
  ensurePersistSetup();

  cleanup();
  const mySession = S.session;

  // Determine if we're resuming the same channel (data from sessionStorage restore).
  const numericMatch = raw.match(/^\d{2,12}$/);
  const slugFromUrl  = !numericMatch && raw.match(/kick\.com\/([^/?#]+)/i);
  const inputSlug    = numericMatch ? null : (slugFromUrl ? slugFromUrl[1] : raw).toLowerCase();
  // Preserve data when reconnecting to the same channel UNLESS the user
  // explicitly stopped the session. This handles HMR, page refreshes, and
  // auto-reconnects correctly without depending on the fragile _resumed flag.
  const isSameChannel =
    S.total > 0 &&
    !S._stoppedExplicitly &&
    (inputSlug
      ? S.channelInfo?.slug === inputSlug
      : S.channelInfo?.chatroomId === Number(raw));

  if (!isSameChannel) {
    // Fresh channel — wipe ALL accumulated data from previous session.
    S.usersMap       = new Map();
    S.emoteCountMap  = new Map();
    S.userTimeMap    = new Map();
    S.timeMap        = new Map();
    S.peakUsers      = null;
    S.quietMoment    = null;
    S.total          = 0;
    S.messages       = [];
    S.timeSeries     = [];
    S.emoteRanking   = [];
    S.emoteMap       = {};
    S.peaks          = [];
    S.titleChanges   = [];
    S.categoryHistory = [];
    S.categoryStats  = [];
    S.lurkerStats     = null;
    S.userCategoryMap = new Map();
    S.emoteTimeMap    = new Map();
    S.emoteByHour     = [];
    S.activePoll      = null;
    S.activePrediction = null;
    S.activeCombo    = null;
    S.comboHistory   = [];
    S.comboTracker   = new Map();
    S.comboSaved     = new Set();
    S.subEvents      = [];
    S.subCount       = 0;
    S.giftCount      = 0;
    S.pinnedMessages = [];
    S.activeMods     = new Map();
    S.chatAnalyzer   = null;
    S.lastSummary    = null;
    setRanking([]);
    setStats(() => ({ totalMessages: 0, uniqueUsers: 0, startedAt: null, stoppedAt: null }));
    setBackfill({ active: false, count: 0, done: false, cappedAt: null, oldestTs: null });
    setChannelInfo(null);
  }

  S._isResume = isSameChannel; // used by subscription_succeeded to avoid incrementing frequent counter
  S._stoppedExplicitly = false; // new connection — allow saving again
  // seenIds always reset (can't restore across reload without large storage).
  S.seenIds  = new Set();
  S.dirty    = false;
  S._resumed = false;

  setError(null);
  setStatus("connecting");

  let info = null;
  if (numericMatch) {
    info = isSameChannel ? S.channelInfo : {
      slug: `chatroom-${raw}`, chatroomId: Number(raw),
      channelId: Number(raw), kickUserId: Number(raw),
      user: { username: `chatroom #${raw}`, profilePic: null },
      isLive: false, liveStartedAt: null, source: "manual",
    };
  } else {
    try {
      const res  = await fetch(`/api/channel/${encodeURIComponent(inputSlug)}?fresh=1`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
      info = body;
    } catch (err) {
      if (S.session !== mySession) return;
      setError(err?.message || "No se pudo obtener el canal");
      setStatus("error");
      return;
    }
  }

  if (S.session !== mySession) return;
  if (!info?.chatroomId) { setError("No se pudo determinar chatroom_id"); setStatus("error"); return; }

  setChannelInfo(info);
  // Record category — only start fresh if no existing history or category changed.
  // Preserves accumulated time across page refreshes.
  if (info.streamCategory) {
    const lastCat = S.categoryHistory[S.categoryHistory.length - 1];
    if (!lastCat) {
      // First time connecting — start history from now
      S.categoryHistory = [{ category: info.streamCategory, startTs: Date.now() }];
      notify();
    } else if (lastCat.category !== info.streamCategory) {
      // Category changed — append new entry
      S.categoryHistory = [...S.categoryHistory, { category: info.streamCategory, startTs: Date.now() }];
      notify();
    }
    // Same category as before (e.g. after refresh) — keep existing history as-is
  }
  fetchEmotes(info.kickUserId, info.slug);
  fetchLeaderboard(info.channelId, info.slug);

  try {
    sessionStorage.setItem(
      "__chatstats_session",
      JSON.stringify({ slug: info.slug, chatroomId: info.chatroomId, kickUserId: info.kickUserId })
    );
  } catch {}

  const { default: Pusher } = await import("pusher-js");

  try {
    const pusher = new Pusher(KICK_PUSHER_KEY, { cluster: KICK_PUSHER_CLUSTER, forceTLS: true });
    S.pusher = pusher;

    pusher.connection.bind("state_change", ({ current }) => {
      if (S.session !== mySession) return;
      if (current === "connected" && S.error) setError(null);
    });

    pusher.connection.bind("error", (err) => {
      if (S.session !== mySession) return;
      const msg  = err?.error?.data?.message || "";
      const code = err?.error?.data?.code;

      // Pusher sends this when it wants us to reconnect — do it silently
      if (msg.toLowerCase().includes("reconnect") || code === 4200 || code === 4100) {
        setTimeout(() => {
          if (S.session === mySession && S.status === "connected" && info?.slug) {
            connect(info.slug).catch(() => {});
          }
        }, 1500);
        return;
      }

      setError(msg || "Error de conexión");
      setStatus("error");
    });

    const channel = pusher.subscribe(`chatrooms.${info.chatroomId}.v2`);
    S.channel = channel;

    channel.bind("pusher:subscription_succeeded", () => {
      if (S.session !== mySession) return;
      setStatus("connected");
      setError(null); // clear any previous connection error
      S._resumed = true;
      recordChannel(info, { increment: !S._isResume }); // only count new sessions
      setStats((prev) => ({
        ...prev,
        startedAt: prev.startedAt ?? Date.now(),
        stoppedAt: null,
      }));
      // Immediately persist so the session is recoverable even on instant refresh.
      if (S.total > 0) persistState(S);
      // Don't re-run backfill if we resumed a session that already completed it.
      if (info.isLive && info.liveStartedAt && !S.backfill.done) {
        runBackfill(info.chatroomId, info.liveStartedAt, mySession);
      }
    });

    channel.bind("pusher:subscription_error", (err) => {
      if (S.session !== mySession) return;
      setError(`No se pudo suscribir al chatroom (${err?.status || "?"})`);
      setStatus("error");
    });

    const handleMessage = (raw) => {
      if (S.session !== mySession) return;
      try {
        const payload  = typeof raw === "string" ? JSON.parse(raw) : raw || {};
        const id       = payload?.id ?? payload?.message?.id;
        const username = payload?.sender?.username || payload?.sender?.slug || payload?.username;
        const color    = payload?.sender?.identity?.color || null;
        const badges   = payload?.sender?.identity?.badges ?? [];
        const content  = payload?.content ?? payload?.message?.content ?? "";
        if (!username?.trim()) return;
        if (id) { if (S.seenIds.has(id)) return; S.seenIds.add(id); }
        countMessage(username, null, content);
        detectCombo(username, content);
        // Track ! commands
        const cmdMatch = content.trim().match(/^(![\w\d_-]+)/i);
        if (cmdMatch) {
          const cmd = cmdMatch[1].toLowerCase();
          S.commandFreq[cmd] = (S.commandFreq[cmd] ?? 0) + 1;
        }
        // Build Kick native emote map from [emote:ID:Name] patterns
        for (const [, id, name] of (content.matchAll(/\[emote:(\d+):([^\]]+)\]/g) || [])) {
          if (name && !S.kickEmoteMap[name]) {
            S.kickEmoteMap[name] = `https://files.kick.com/emotes/${id}/fullsize`;
          }
        }


        // Track active mods / broadcaster
        const isBroadcaster = badges.some((b) => b.type === "broadcaster");
        const isMod         = badges.some((b) => ["moderator","global_moderator","global_mod","admin","global_admin"].includes(b.type));
        if (isMod || isBroadcaster) {
          const badgeType = badges.find((b) => ["broadcaster","moderator","global_moderator","global_mod","admin","global_admin"].includes(b.type))?.type ?? "moderator";
          const prev = S.activeMods.get(username) ?? { username, count: 0, firstSeen: Date.now(), isBroadcaster, badgeType };
          S.activeMods.set(username, { ...prev, count: prev.count + 1, lastSeen: Date.now(), isBroadcaster, badgeType });
        }
        // Persist on every 100th message as insurance
        if (S.total > 0 && S.total % 100 === 0) persistState(S);
        const msg = { id: id ?? String(Date.now() + Math.random()), username, color, badges, content, ts: Date.now() };
        S.messages = S.messages.length >= MAX_MESSAGES
          ? [...S.messages.slice(1), msg]
          : [...S.messages, msg];
      } catch {}
    };

    channel.bind("App\\Events\\ChatMessageSentEvent", handleMessage);
    channel.bind("App\\Events\\ChatMessageEvent",     handleMessage);

    // ── Stream end detection via Pusher ───────────────────────────────────
    // Kick sends these events when the streamer ends the broadcast.
    const handleStreamEnd = () => {
      if (S.session !== mySession) return;
      // Import stop lazily to avoid circular reference
      setTimeout(() => {
        if (S.session === mySession && S.status === "connected") {
          // Notify UI via status change — page.js polling will confirm and call stop()
          setStatus("stopped");
          setStats((prev) => ({ ...prev, stoppedAt: Date.now() }));
        }
      }, 3000); // small delay so last messages can arrive
    };
    channel.bind("App\\Events\\StreamerIsLive",           handleStreamEnd); // Kick sends false
    channel.bind("App\\Events\\StopStreamBroadcast",      handleStreamEnd);
    channel.bind("App\\Events\\LivestreamUpdated",        (raw) => {
      if (S.session !== mySession) return;
      try {
        const p = typeof raw === "string" ? JSON.parse(raw) : raw || {};
        if (p?.is_live === false || p?.livestream?.is_live === false) handleStreamEnd();
      } catch {}
    });

    // ── Subscription events ────────────────────────────────────────────────
    const handleSub = (raw) => {
      if (S.session !== mySession) return;
      try {
        const p = typeof raw === "string" ? JSON.parse(raw) : raw || {};
        const ev = {
          type:     "sub",
          username: p?.username || p?.user?.username || "—",
          months:   p?.months ?? 1,
          ts:       Date.now(),
        };
        S.subEvents = [...S.subEvents, ev];
        S.subCount += 1;
        notify();
      } catch {}
    };

    const handleGift = (raw) => {
      if (S.session !== mySession) return;
      try {
        const p        = typeof raw === "string" ? JSON.parse(raw) : raw || {};
        const gifter   = p?.gifter?.username || p?.gifter_username || p?.sender?.username || "Anónimo";
        const quantity = p?.quantity || p?.gifted_usernames?.length || 1;
        const ev = {
          type:     "gift",
          gifter,
          quantity,
          ts:       Date.now(),
        };
        S.subEvents = [...S.subEvents, ev];
        S.giftCount += quantity;
        notify();
      } catch {}
    };

    // ── Poll events ────────────────────────────────────────────────────────
    const handlePollUpdate = (raw) => {
      if (S.session !== mySession) return;
      try {
        const p    = typeof raw === "string" ? JSON.parse(raw) : raw || {};
        const poll = p?.poll ?? p;
        if (!poll?.title && !poll?.id) return;
        const options = (poll.options ?? poll.choices ?? []).map((o) => ({
          id:    o.id ?? o.option_id,
          label: o.label ?? o.text ?? o.title ?? String(o.id),
          votes: o.votes ?? o.vote_count ?? 0,
        }));
        S.activePoll = {
          id:        poll.id,
          title:     poll.title ?? poll.question ?? "Encuesta",
          options,
          duration:  poll.duration ?? null,
          remaining: poll.remaining ?? null,
          createdAt: poll.created_at ? Date.parse(poll.created_at) : Date.now(),
        };
        notify();
      } catch {}
    };
    const handlePollDelete = () => {
      if (S.session !== mySession) return;
      S.activePoll = null;
      notify();
    };
    channel.bind("App\\Events\\PollUpdateEvent",  handlePollUpdate);
    channel.bind("App\\Events\\PollDelete",        handlePollDelete);
    channel.bind("App\\Events\\DeletePollEvent",   handlePollDelete);

    // ── Prediction events ──────────────────────────────────────────────────
    const handlePrediction = (raw) => {
      if (S.session !== mySession) return;
      try {
        const p    = typeof raw === "string" ? JSON.parse(raw) : raw || {};
        // Kick nests prediction under different keys depending on event
        const pred = p?.prediction ?? p?.data?.prediction ?? p?.data ?? p;
        if (!pred) return;

        const rawOutcomes = pred.outcomes ?? pred.options ?? pred.choices ?? [];
        const COLORS = ["#60a5fa", "#f97316", "#a78bfa", "#34d399", "#f43f5e"];
        const outcomes = rawOutcomes.map((o, i) => ({
          id:          o.id,
          title:       o.title ?? o.label ?? o.text ?? o.name ?? String(o.id),
          totalPoints: o.total_points ?? o.total_amount ?? o.points ?? o.votes ?? 0,
          totalUsers:  o.total_users  ?? o.users_count  ?? o.users  ?? 0,
          color:       o.color ?? COLORS[i % COLORS.length],
          winner:      Boolean(o.is_winner ?? o.winner ?? false),
        }));

        const title = pred.title ?? pred.question ?? pred.name;
        if (!title && !pred.id) return;

        S.activePrediction = {
          id:        pred.id,
          title:     title ?? "Predicción",
          outcomes,
          status:    pred.status ?? pred.state ?? "active",
          lockedAt:  pred.locked_at   ? Date.parse(pred.locked_at)   : null,
          createdAt: pred.created_at  ? Date.parse(pred.created_at)  : Date.now(),
          winnerId:  pred.winning_outcome_id ?? pred.winner_id ?? null,
        };
        notify();
      } catch {}
    };
    const handlePredictionEnd = () => {
      if (S.session !== mySession) return;
      if (S.activePrediction) {
        S.activePrediction = { ...S.activePrediction, status: "resolved" };
        notify();
      }
    };
    channel.bind("App\\Events\\PredictionCreatedEvent",   handlePrediction);
    channel.bind("App\\Events\\PredictionUpdatedEvent",   handlePrediction);
    channel.bind("App\\Events\\PredictionLockedEvent",    handlePrediction);
    channel.bind("App\\Events\\PredictionResultEvent",    handlePrediction);
    channel.bind("App\\Events\\PredictionWindowOpenEvent",handlePrediction);
    channel.bind("App\\Events\\PredictionWindowCloseEvent",handlePrediction);
    channel.bind("App\\Events\\PredictionCancelledEvent", () => {
      if (S.session !== mySession) return;
      S.activePrediction = null; notify();
    });

    channel.bind("App\\Events\\SubscriptionEvent",                         handleSub);
    channel.bind("App\\Events\\GiftedSubscriptionsEvent",                  handleGift);
    channel.bind("App\\Events\\LuckyUsersWhoGotGiftSubscriptionsEvent",    handleGift);

    const handlePinnedMessage = (raw) => {
      if (S.session !== mySession) return;
      try {
        const p = typeof raw === "string" ? JSON.parse(raw) : raw || {};
        const msg = p?.message ?? p;
        const content  = msg?.content ?? msg?.message?.content ?? "";
        const username = msg?.sender?.username ?? msg?.user?.username ?? "?";
        const id       = msg?.id ?? String(Date.now());
        if (!content) return;
        // avoid duplicates
        if (S.pinnedMessages.some((m) => m.id === id)) return;
        // Use original message timestamp if available
        const rawTs = msg?.created_at ?? msg?.createdAt ?? msg?.timestamp ?? null;
        const ts = rawTs ? new Date(rawTs).getTime() : Date.now();
        S.pinnedMessages = [...S.pinnedMessages, { id, username, content, ts }];
        notify();
      } catch {}
    };
    channel.bind("App\\Events\\PinnedMessageCreatedEvent", handlePinnedMessage);
    channel.bind("App\\Events\\MessagePinnedEvent",        handlePinnedMessage);

    S.tick = setInterval(flush, 1000);
  } catch (err) {
    if (S.session !== mySession) return;
    setError(err?.message || "Error inicializando Pusher");
    setStatus("error");
  }
}

// Put the app in "waiting" mode — channel is offline, waiting to go live.
export function startWaiting(channelInfo) {
  cleanup();
  S.channelInfo = channelInfo;
  S.status      = "waiting";
  notify();
  // Save so auto-reconnect knows which channel to watch
  try {
    sessionStorage.setItem("__chatstats_session",
      JSON.stringify({ slug: channelInfo.slug, chatroomId: channelInfo.chatroomId, kickUserId: channelInfo.kickUserId }));
  } catch {}
}

// Cancel waiting mode without building a summary (no session was started).
export function cancelWaiting() {
  S._stoppedExplicitly = true;
  S._resumed = false;
  cleanup();
  clearPersistedState();
  try { sessionStorage.removeItem("__chatstats_session"); } catch {}
  S.channelInfo = null;
  S.status = "idle";
  notify();
}

export function stop() {
  S._stoppedExplicitly = true;
  S._resumed = false;
  flush();

  // Build session summary before clearing state
  const now         = Date.now();
  const sessionMs   = S.stats.startedAt ? now - S.stats.startedAt : 0;
  const topUser     = S.ranking[0] ?? null;
  const peakMoment  = S.peaks.length
    ? S.peaks.reduce((a, b) => b.count > a.count ? b : a)
    : null;
  const topEmote    = S.emoteRanking[0] ?? null;
  const longestCat  = S.categoryHistory.length
    ? (() => {
        const dur = {};
        S.categoryHistory.forEach((c, i) => {
          const end = S.categoryHistory[i + 1]?.startTs ?? now;
          dur[c.category] = (dur[c.category] ?? 0) + (end - c.startTs);
        });
        return Object.entries(dur).sort((a, b) => b[1] - a[1])[0] ?? null;
      })()
    : null;

  S.lastSummary = {
    channel:       S.channelInfo?.user?.username || S.channelInfo?.slug,
    sessionMs,
    totalMessages: S.total,
    uniqueUsers:   S.usersMap.size,
    topUser:       topUser ? { username: topUser.username, count: topUser.count } : null,
    peakMoment,
    topEmote,
    longestCat:    longestCat ? { category: longestCat[0], durationMs: longestCat[1] } : null,
    titleChanges:  S.titleChanges.length,
    peakCount:     S.peaks.length,
    streamTitle:   S.channelInfo?.streamTitle,
    stoppedAt:     now,
    lurkerStats:   S.lurkerStats ?? null,
    subCount:      S.subCount,
    giftCount:     S.giftCount,
  };
  notify();

  persistState(S);
  saveSession(S);
  cleanup();
  clearPersistedState();
  try { sessionStorage.removeItem("__chatstats_session"); } catch {}
  setStatus("stopped");
  setStats((prev) => ({ ...prev, stoppedAt: Date.now() }));
}

export function reset() {
  cleanup();
  clearPersistedState();
  try { sessionStorage.removeItem("__chatstats_session"); } catch {}
  S.usersMap = new Map(); S.emoteCountMap = new Map(); S.userTimeMap = new Map();
  S.seenIds = new Set(); S.timeMap = new Map();
  S.total = 0; S.dirty = false; S._resumed = false;
  S.peakUsers = null; S.quietMoment = null;
  S.timeSeries = []; S.messages = []; S.emoteRanking = []; S.emoteMap = {};
  S.peaks = []; S.titleChanges = []; S.categoryHistory = [];
  S.activeCombo = null; S.comboHistory = []; S.comboTracker = new Map(); S.comboSaved = new Set();
  S.subEvents = []; S.subCount = 0; S.giftCount = 0; S.pinnedMessages = []; S.activeMods = new Map(); S.peakViewerCount = 0; S.commandFreq = {};
  S.trackedUsername = null;
  setRanking([]); setChannelInfo(null); setError(null);
  setBackfill({ active: false, count: 0, done: false, cappedAt: null, oldestTs: null });
  setStats(() => ({ totalMessages: 0, uniqueUsers: 0, startedAt: null, stoppedAt: null }));
  setStatus("idle");
}

export function getSavedSession() {
  // Also trigger restore here so the hook can read restored state before connect().
  restoreIfNeeded();
  ensurePersistSetup();
  try {
    const raw = sessionStorage.getItem("__chatstats_session");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export async function exportXLSX() {
  const { ranking, emoteRanking, peaks, titleChanges, categoryHistory, comboHistory, stats, channelInfo } = S;

  // emoteCounts is a Map — convert to plain object for JSON serialization
  const serializeRanking = ranking.map((u) => ({
    ...u,
    emoteCounts: u.emoteCounts
      ? Object.fromEntries(u.emoteCounts)
      : {},
  }));

  const res = await fetch("/api/export", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ranking: serializeRanking, emoteRanking, peaks, titleChanges, categoryHistory, comboHistory, stats, channelInfo }),
  });

  if (!res.ok) { console.error("Export failed", res.status); return; }

  const blob  = await res.blob();
  const url   = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().slice(0, 16).replace(/[T:]/g, "-");
  const slug  = channelInfo?.slug || "session";
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: `chatstats-${slug}-${stamp}.xlsx`,
  });
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

export function exportCSV() {
  const { ranking, emoteRanking, peaks, titleChanges, stats, channelInfo } = S;
  const slug    = channelInfo?.slug || "session";
  const channel = channelInfo?.user?.username || slug;
  const now     = new Date();

  const fmtDate = (ts) => ts ? new Date(ts).toLocaleString() : "";
  const fmtDur  = (ms) => {
    if (!ms || ms < 0) return "";
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return h ? `${h}h ${m}m ${sec}s` : m ? `${m}m ${sec}s` : `${sec}s`;
  };
  // Prefix formula chars with tab to prevent CSV injection (=, +, -, @, \t, \r).
  const esc = (v) => {
    let s = String(v ?? "");
    if (/^[=+\-@\t\r]/.test(s)) s = `\t${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const row = (...cells) => cells.map(esc).join(",");
  const sep = () => "";

  const sessionDuration = stats.startedAt && stats.stoppedAt
    ? fmtDur(stats.stoppedAt - stats.startedAt)
    : fmtDur(stats.startedAt ? Date.now() - stats.startedAt : 0);

  const lines = [
    // ── Metadata ─────────────────────────────────────────────────────
    row("ChatStats — Exportación de sesión"),
    row("Canal", channel),
    row("Categoría", channelInfo?.streamCategory || ""),
    row("Título del stream", channelInfo?.streamTitle || ""),
    row("Inicio del stream", fmtDate(channelInfo?.liveStartedAt)),
    row("Inicio de sesión", fmtDate(stats.startedAt)),
    row("Fin de sesión", fmtDate(stats.stoppedAt || Date.now())),
    row("Duración de sesión", sessionDuration),
    row("Total mensajes", stats.totalMessages),
    row("Usuarios únicos", stats.uniqueUsers),
    row("Exportado el", now.toLocaleString()),
    sep(),

    // ── Ranking de viewers ────────────────────────────────────────────
    row("RANKING DE VIEWERS"),
    row("Rank","Usuario","Mensajes","% del chat","Msgs/min","Primer mensaje","Último mensaje","Duración activa","Emote favorito","Usos emote"),
    ...ranking.map((u, i) => {
      let topName = "", topCount = 0;
      if (u.emoteCounts?.size) {
        for (const [n, c] of u.emoteCounts) { if (c > topCount) { topCount = c; topName = n; } }
      }
      const pct    = stats.totalMessages > 0 ? ((u.count / stats.totalMessages) * 100).toFixed(2) + "%" : "";
      const durMs  = u.lastSeen - u.firstSeen;
      const durMin = durMs / 60_000;
      const rate   = durMin > 0.5 ? (u.count / durMin).toFixed(2) : "";
      return row(i + 1, u.username, u.count, pct, rate,
        fmtDate(u.firstSeen), fmtDate(u.lastSeen), fmtDur(durMs),
        topName, topCount || "");
    }),
    sep(),

    // ── Top emotes ────────────────────────────────────────────────────
    ...(emoteRanking.length > 0 ? [
      row("TOP EMOTES"),
      row("Rank","Emote","Usos","% del total"),
      ...emoteRanking.map((e, i) => {
        const pct = stats.totalMessages > 0 ? ((e.count / stats.totalMessages) * 100).toFixed(2) + "%" : "";
        return row(i + 1, e.name, e.count, pct);
      }),
      sep(),
    ] : []),

    // ── Picos de actividad ────────────────────────────────────────────
    ...(peaks.length > 0 ? [
      row("PICOS DE ACTIVIDAD"),
      row("Hora","Msgs ese minuto","Media previa","Multiplicador"),
      ...peaks.map((p) => {
        const mult = p.avg > 0 ? (p.count / p.avg).toFixed(1) + "x" : "";
        return row(new Date(p.ts).toLocaleTimeString(), p.count, p.avg, mult);
      }),
      sep(),
    ] : []),

    // ── Cambios de título ─────────────────────────────────────────────
    ...(titleChanges.length > 0 ? [
      row("CAMBIOS DE TÍTULO"),
      row("Hora","Título anterior","Título nuevo"),
      ...titleChanges.map((c) => row(new Date(c.ts).toLocaleTimeString(), c.from, c.to)),
      sep(),
    ] : []),
  ];

  // UTF-8 BOM so Excel opens with correct encoding
  const BOM  = "﻿";
  const csv  = BOM + lines.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const stamp = now.toISOString().slice(0,16).replace(/[T:]/g,"-");
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: `chatstats-${slug}-${stamp}.csv`,
  });
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}
