export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STV_CDN = "https://cdn.7tv.app/emote";
const STV_API = "https://7tv.io/v3";

function shapeStvEmotes(emotes = []) {
  const map = {};
  for (const e of emotes) {
    if (!e?.name || !e?.id) continue;
    map[e.name] = `${STV_CDN}/${e.id}/1x.webp`;
  }
  return map;
}

async function stv(path, opts = {}) {
  try {
    const r = await fetch(`${STV_API}${path}`, {
      headers: { accept: "application/json" },
      cache: "no-store",
      ...opts,
    });
    if (!r.ok) return null;
    return r.json();
  } catch { return null; }
}

async function stvGql(query) {
  try {
    const r = await fetch(`${STV_API}/gql`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ query }),
      cache: "no-store",
    });
    if (!r.ok) return null;
    return r.json();
  } catch { return null; }
}

// 1. Global 7TV emotes
async function fetch7tvGlobal() {
  const data = await stv("/emote-sets/global", { next: { revalidate: 3600 } });
  return shapeStvEmotes(data?.emotes);
}

// 2. Channel active emote set by Kick user ID (most accurate)
async function fetch7tvByKickUserId(kickUserId) {
  if (!kickUserId) return {};
  const data = await stv(`/users/kick/${kickUserId}`);
  return shapeStvEmotes(data?.emote_set?.emotes);
}

// 3. Fallback: GQL user search by slug — returns ALL emote sets of that user
async function fetch7tvBySlug(slug) {
  if (!slug) return {};
  const safeSlug = slug.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 50);
  const res = await stvGql(`{
    users(query: "${safeSlug}", limit: 3) {
      connections { platform id }
      emote_sets { id name emotes { id name } }
    }
  }`);
  const users = res?.data?.users ?? [];
  // Prefer a user with a KICK connection matching the slug
  const target =
    users.find((u) =>
      u.connections?.some(
        (c) => c.platform === "KICK" && c.username?.toLowerCase() === safeSlug
      )
    ) ?? users[0];
  if (!target) return {};
  let merged = {};
  for (const set of target.emote_sets ?? []) {
    Object.assign(merged, shapeStvEmotes(set.emotes));
  }
  return merged;
}

// 4. Fetch a specific 7TV emote set by ID (used when user provides one)
async function fetch7tvSet(setId) {
  if (!setId) return {};
  const data = await stv(`/emote-sets/${setId}`);
  return shapeStvEmotes(data?.emotes);
}

const VALID_KICK_ID = /^\d{1,12}$/;
const VALID_SLUG_RE = /^[a-z0-9_-]{1,64}$/i;
const VALID_SET_ID  = /^[a-zA-Z0-9]{10,30}$/; // 7TV ObjectID format

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const rawKickUserId = searchParams.get("kickUserId");
  const rawSlug       = searchParams.get("slug");
  const rawSetId      = searchParams.get("setId");

  // Validate and sanitize all parameters
  const kickUserId = rawKickUserId && VALID_KICK_ID.test(rawKickUserId) ? rawKickUserId : null;
  const slug       = rawSlug       && VALID_SLUG_RE.test(rawSlug)       ? rawSlug.toLowerCase() : null;
  const setId      = rawSetId      && VALID_SET_ID.test(rawSetId)       ? rawSetId : null;

  const [globalMap, channelMap] = await Promise.all([
    fetch7tvGlobal(),
    setId
      ? fetch7tvSet(setId)
      : kickUserId
        ? fetch7tvByKickUserId(kickUserId).then((m) =>
            Object.keys(m).length ? m : fetch7tvBySlug(slug)
          )
        : fetch7tvBySlug(slug),
  ]);

  return Response.json({
    global:  Object.keys(globalMap).length,
    channel: Object.keys(channelMap).length,
    emotes:  { ...globalMap, ...channelMap }, // channel overrides global
  });
}
