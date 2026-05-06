// Module-level singleton that survives Next.js HMR.

import { persistState, loadPersistedState, clearPersistedState } from "./chatPersist.js"; // eslint-disable-line
import { saveSession } from "./sessionHistory.js";

const G = globalThis;

const MAX_MESSAGES   = 200;
const MAX_EMOTE_RANK = 50;

const DEFAULTS = () => ({
  status: "idle",
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
  subEvents: [],   // [{ type: 'sub'|'gift', username, gifter, quantity, months, ts }]
  subCount: 0,
  giftCount: 0,
  activeCombo:  null,
  comboHistory: [], // [{ name, url, maxCount, ts }] — best combos of the session
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
  S.channelInfo   = saved.channelInfo;
  S.stats         = saved.stats;
  S.backfill      = saved.backfill;
  S.total         = saved.total;
  S.usersMap      = saved.usersMap;
  S.emoteCountMap = saved.emoteCountMap;
  S.timeMap       = saved.timeMap;
  S.userTimeMap   = saved.userTimeMap ?? new Map();
  S.messages      = saved.messages;
  S.peakUsers       = saved.peakUsers       ?? null;
  S.quietMoment     = saved.quietMoment     ?? null;
  S.categoryHistory = saved.categoryHistory ?? [];
  S.comboHistory    = saved.comboHistory    ?? [];
  S.peaks           = saved.peaks           ?? [];
  S.titleChanges    = saved.titleChanges    ?? [];
  S.status          = "stopped";
  S._resumed      = true;
  S.dirty         = true;
  flush(); // rebuilds ranking, emoteRanking, timeSeries, stats
}

// NOTE: doRestore() is intentionally NOT called here at module level.
// Running it synchronously before React's first render causes a server/client
// hydration mismatch (server renders empty state, client sees restored data).
// Instead it is called lazily from getSavedSession() inside useEffect, which
// runs only on the client after React has successfully hydrated.

function ensurePersistSetup() {
  if (typeof window !== "undefined" && !G.__persistListenerAdded) {
    G.__persistListenerAdded = true;

    // Save on every unload signal — beforeunload, pagehide, visibilitychange.
    // Next.js HMR reloads use pagehide which is more reliable than beforeunload.
    const saveNow = () => { if (S.total > 0) persistState(S); };
    window.addEventListener("beforeunload",    saveNow);
    window.addEventListener("pagehide",        saveNow);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) saveNow();
    });

    // Insurance: save every 30s regardless of flush cycle
    setInterval(saveNow, 30_000);
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
    subEvents:       S.subEvents,
    subCount:        S.subCount,
    giftCount:       S.giftCount,
    activeCombo:  S.activeCombo,
    comboHistory: S.comboHistory,
    lastSummary:  S.lastSummary,
    donors:          S.donors,
    peakUsers:       S.peakUsers,
    quietMoment:     S.quietMoment,
    trackedUsername: S.trackedUsername,
    messages:     S.messages,
    emoteMap:     S.emoteMap,
  };
}

function setStatus(v)     { S.status = v;                                                  notify(); }
function setError(v)      { S.error  = v;                                                  notify(); }
function setChannelInfo(v){ S.channelInfo = v;                                             notify(); }
function setStats(fn)     { S.stats    = fn(S.stats);                                     notify(); }
function setBackfill(fn)  { S.backfill = typeof fn === "function" ? fn(S.backfill) : fn;  notify(); }
function setRanking(v)    { S.ranking  = v;                                               notify(); }

const MIN_MS          = 60_000;
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
const COMBO_WINDOW   = 8_000;  // ms — emote must be used within this window
const COMBO_MIN      = 3;      // minimum uses to start showing a combo

function detectCombo(username, content) {
  if (!content) return;
  const now    = Date.now();
  const emotes = extractEmotes(content).map((e) => e.name);
  if (!emotes.length) return;

  // Expire old combo entries
  for (const [name, entry] of S.comboTracker) {
    if (now - entry.lastTs > COMBO_WINDOW) S.comboTracker.delete(name);
  }

  for (const name of emotes) {
    let entry = S.comboTracker.get(name);
    if (!entry) {
      entry = { count: 0, lastTs: now, users: new Set() };
      S.comboTracker.set(name, entry);
    }
    entry.count  += 1;
    entry.lastTs  = now;
    entry.users.add(username);
  }

  // Find the hottest combo (most uses, at least COMBO_MIN unique users preferred)
  let best = null;
  for (const [name, entry] of S.comboTracker) {
    if (entry.users.size < COMBO_MIN) continue;
    if (!best || entry.count > best.count) {
      best = { name, count: entry.count, url: S.emoteMap[name] ?? null, startTs: now };
    }
  }

  const prev = S.activeCombo;
  if (best) {
    if (!prev || best.name === prev.name || best.count > prev.count) {
      S.activeCombo = { ...best, startTs: prev?.name === best.name ? prev.startTs : now };

      // Save to history when reaching a new high (milestone: every 5 counts from COMBO_MIN)
      const milestone = best.count >= COMBO_MIN && best.count % 5 === 0;
      const comboKey  = `${best.name}-${best.count}`;
      if (milestone && !S.comboSaved.has(comboKey)) {
        S.comboSaved.add(comboKey);
        // Update or add history entry for this emote
        const existingIdx = S.comboHistory.findIndex((c) => c.name === best.name);
        const entry = { name: best.name, url: best.url, maxCount: best.count, ts: now };
        if (existingIdx >= 0 && best.count > S.comboHistory[existingIdx].maxCount) {
          S.comboHistory = S.comboHistory.map((c, i) => i === existingIdx ? entry : c);
        } else if (existingIdx < 0) {
          S.comboHistory = [...S.comboHistory, entry];
        }
      }
      notify();
    }
  } else if (prev && now - prev.startTs > COMBO_WINDOW * 1.5) {
    S.activeCombo = null;
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
  // Track unique chatters per minute
  if (!S.userTimeMap.has(bucket)) S.userTimeMap.set(bucket, new Set());
  S.userTimeMap.get(bucket).add(username);
  if (content) {
    for (const { name } of extractEmotes(content)) {
      S.emoteCountMap.set(name, (S.emoteCountMap.get(name) ?? 0) + 1);
      user.emoteCounts.set(name, (user.emoteCounts.get(name) ?? 0) + 1);
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

  S.emoteRanking = Array.from(S.emoteCountMap.entries())
    .sort((a, b) => b[1] - a[1]).slice(0, MAX_EMOTE_RANK)
    .map(([name, count]) => ({ name, url: S.emoteMap[name] ?? null, count }));


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
    S.categoryStats = Object.entries(catData).map(([category, d]) => ({
      category,
      totalMessages:    d.msgs,
      avgMsgsPerMin:    d.buckets > 0 ? Math.round(d.msgs / d.buckets) : 0,
      avgUsersPerMin:   d.buckets > 0 ? Math.round(d.userMins / d.buckets) : 0,
      totalMinutes:     d.buckets,
    })).sort((a, b) => b.totalMessages - a.totalMessages);
  }

  // ── Unique chatters per minute (peak & quiet) ──────────────────────────────
  {
    const userSeries = Array.from(S.userTimeMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([min, users]) => ({ min, uniqueUsers: users.size }))
      .filter((b) => b.uniqueUsers > 0);

    if (userSeries.length > 0) {
      S.peakUsers   = userSeries.reduce((a, b) => b.uniqueUsers > a.uniqueUsers ? b : a);
      S.quietMoment = userSeries.length > 1
        ? userSeries.reduce((a, b) => b.uniqueUsers < a.uniqueUsers ? b : a)
        : null;
    }
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
    if (data?.emotes) { S.emoteMap = data.emotes; notify(); }
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
  const isSameChannel =
    S._resumed &&
    S.total > 0 &&
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
    S.activeCombo    = null;
    S.comboHistory   = [];
    S.comboTracker   = new Map();
    S.comboSaved     = new Set();
    S.subEvents      = [];
    S.subCount       = 0;
    S.giftCount      = 0;
    S.lastSummary    = null;
    setRanking([]);
    setStats(() => ({ totalMessages: 0, uniqueUsers: 0, startedAt: null, stoppedAt: null }));
    setBackfill({ active: false, count: 0, done: false, cappedAt: null, oldestTs: null });
    setChannelInfo(null);
  }

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

    pusher.connection.bind("error", (err) => {
      if (S.session !== mySession) return;
      setError(err?.error?.data?.message || "Error de conexión");
      setStatus("error");
    });

    const channel = pusher.subscribe(`chatrooms.${info.chatroomId}.v2`);
    S.channel = channel;

    channel.bind("pusher:subscription_succeeded", () => {
      if (S.session !== mySession) return;
      setStatus("connected");
      setStats((prev) => ({ ...prev, startedAt: prev.startedAt ?? Date.now() }));
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
        if (!username) return;
        if (id) { if (S.seenIds.has(id)) return; S.seenIds.add(id); }
        countMessage(username, null, content);
        detectCombo(username, content);
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

    channel.bind("App\\Events\\SubscriptionEvent",                         handleSub);
    channel.bind("App\\Events\\GiftedSubscriptionsEvent",                  handleGift);
    channel.bind("App\\Events\\LuckyUsersWhoGotGiftSubscriptionsEvent",    handleGift);

    S.tick = setInterval(flush, 1000);
  } catch (err) {
    if (S.session !== mySession) return;
    setError(err?.message || "Error inicializando Pusher");
    setStatus("error");
  }
}

export function stop() {
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
  S.subEvents = []; S.subCount = 0; S.giftCount = 0;
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
