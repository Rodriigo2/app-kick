// Generic persistence for the chat session singleton.
// Automatically serializes the entire S object (handling Map/Set).
// Any new field added to DEFAULTS is persisted without touching this file.

const KEY      = "__chatstats_data";
const VERSION  = 9;
const MIN_VERSION = 5; // accept from v5; migrations handle format differences
const TTL_MS   = 24 * 60 * 60 * 1000;

// ── Serialization helpers ─────────────────────────────────────────────────────
// Handles Map, Set and nested structures for JSON storage.

function serialize(val) {
  if (val instanceof Map) {
    return { __t: "M", d: Array.from(val.entries()).map(([k, v]) => [k, serialize(v)]) };
  }
  if (val instanceof Set) {
    return { __t: "S", d: Array.from(val).map(serialize) };
  }
  if (Array.isArray(val)) return val.map(serialize);
  if (val && typeof val === "object") {
    const out = {};
    for (const [k, v] of Object.entries(val)) out[k] = serialize(v);
    return out;
  }
  return val;
}

function deserialize(val) {
  if (!val || typeof val !== "object") return val;
  if (Array.isArray(val)) return val.map(deserialize);
  if (val.__t === "M") return new Map(val.d.map(([k, v]) => [k, deserialize(v)]));
  if (val.__t === "S") return new Set(val.d.map(deserialize));
  const out = {};
  for (const [k, v] of Object.entries(val)) out[k] = deserialize(v);
  return out;
}

// ── Fields NOT to persist (non-serializable or ephemeral) ─────────────────────
const SKIP = new Set([
  "pusher", "channel", "tick", "listeners",
  "comboTracker", "comboSaved", "seenIds",
  "_stoppedExplicitly", "_resumed", "session", "dirty",
]);

// Fields to RESET on restore (recomputed or intentionally ephemeral) ──────────
const RESET_ON_RESTORE = {
  status:          "stopped",
  error:           null,
  activePoll:      null,
  activePrediction: null,
  activeCombo:     null,
  trackedUsername: null,
  lurkerStats:     null,
  categoryStats:   [],
  ranking:         [],
  emoteRanking:    [],
  timeSeries:      [],
};

// ─────────────────────────────────────────────────────────────────────────────

function write(data) {
  const json = JSON.stringify(data);
  try { localStorage.setItem(KEY, json);   } catch {}
  try { sessionStorage.setItem(KEY, json); } catch {}
}

function read() {
  for (const store of [sessionStorage, localStorage]) {
    try {
      const raw = store?.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
  }
  return null;
}

// Fields to strip from individual user objects in usersMap before persisting.
// recentMsgs can be thousands of entries per user → too large for localStorage.
const STRIP_USER = new Set(["recentMsgs"]);

export function persistState(S) {
  try {
    if (!S.channelInfo || S.total === 0) return;

    const snapshot = { v: VERSION, savedAt: Date.now() };

    for (const [key, val] of Object.entries(S)) {
      if (SKIP.has(key)) continue;
      if (typeof val === "function") continue;

      if (key === "usersMap" && val instanceof Map) {
        // Serialize users without large per-user arrays
        const clean = new Map();
        for (const [username, user] of val) {
          const u = {};
          for (const [k, v] of Object.entries(user)) {
            if (!STRIP_USER.has(k)) u[k] = v;
          }
          clean.set(username, u);
        }
        snapshot[key] = serialize(clean);
      } else {
        snapshot[key] = serialize(val);
      }
    }

    write(snapshot);
  } catch {}
}

// ── Migration helpers ─────────────────────────────────────────────────────────
// Convert old-format arrays back to Maps/Sets so no data is ever lost on upgrade.

function oldArrayToMap(arr) {
  // Handles both old [key, value][] and new { __t: "M", d: [...] } formats
  if (!arr) return new Map();
  if (arr.__t === "M") return deserialize(arr); // already new format
  if (!Array.isArray(arr)) return new Map();
  return new Map(arr.map(([k, v]) => [k, v instanceof Object && !Array.isArray(v) ? v : v]));
}

function migrateToV9(raw) {
  // v5-v8 used hand-crafted arrays; v9 uses generic serialize/deserialize.
  // Reconstruct Maps from their old serialized shapes.

  // usersMap: was array of { u, c, fs, ls, te, st, am }
  if (Array.isArray(raw.usersMap)) {
    const map = new Map();
    for (const u of raw.usersMap) {
      if (!u?.u) continue;
      const emoteCounts = u.te ? new Map([u.te]) : new Map();
      const activeMins  = new Set(Array.isArray(u.am) ? u.am : []);
      map.set(u.u, {
        username:    u.u,
        count:       u.c  ?? 0,
        firstSeen:   u.fs ?? 0,
        lastSeen:    u.ls ?? 0,
        lastMessage: u.lm ?? "",
        emoteCounts,
        activeMins,
        streak:      u.st ?? 0,
      });
    }
    raw.usersMap = serialize(map);
  }

  // emoteCountMap: was [name, count][]
  if (Array.isArray(raw.emoteCount) && !raw.emoteCountMap) {
    raw.emoteCountMap = serialize(new Map(raw.emoteCount));
  }

  // timeMap: was [bucket, count][]
  if (Array.isArray(raw.timeMap)) {
    raw.timeMap = serialize(new Map(raw.timeMap));
  }

  // userTimeMap: was [[bucket, [usernames]]]
  if (Array.isArray(raw.userTimeMap)) {
    raw.userTimeMap = serialize(
      new Map(raw.userTimeMap.map(([b, users]) => [b, new Set(users)]))
    );
  }

  // userCategoryMap: was [[username, [[cat, count]]]]
  if (Array.isArray(raw.userCategoryMap)) {
    raw.userCategoryMap = serialize(
      new Map(raw.userCategoryMap.map(([u, entries]) => [u, new Map(entries)]))
    );
  }

  return raw;
}

export function loadPersistedState() {
  try {
    let raw = read();
    if (!raw) return null;
    if (!raw.v || raw.v < MIN_VERSION) return null;
    if (!raw.channelInfo || !raw.total) return null;
    if (raw.savedAt && Date.now() - raw.savedAt > TTL_MS) {
      clearPersistedState();
      return null;
    }

    // Apply migration if data is from an older version
    if (raw.v < VERSION) raw = migrateToV9(raw);

    // Deserialize all fields using generic deserializer
    const restored = {};
    for (const [key, val] of Object.entries(raw)) {
      if (key === "v" || key === "savedAt") continue;
      try { restored[key] = deserialize(val); } catch { /* skip corrupt field */ }
    }

    // Apply reset overrides (ephemeral fields)
    for (const [key, resetVal] of Object.entries(RESET_ON_RESTORE)) {
      restored[key] = resetVal;
    }

    // Ensure required Maps/Sets exist (fallback if migration missed something)
    const ensureMap = (k) => { if (!(restored[k] instanceof Map)) restored[k] = new Map(); };
    const ensureSet = (k) => { if (!(restored[k] instanceof Set)) restored[k] = new Set(); };
    ["usersMap","emoteCountMap","timeMap","userTimeMap","userCategoryMap","emoteTimeMap"].forEach(ensureMap);
    restored.seenIds      = new Set();
    restored.comboTracker = new Map();
    restored.comboSaved   = new Set();

    return restored;
  } catch {
    return null;
  }
}

export function clearPersistedState() {
  try { localStorage.removeItem(KEY);   } catch {}
  try { sessionStorage.removeItem(KEY); } catch {}
}
