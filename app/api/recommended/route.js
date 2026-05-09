import { getBrowser } from "@/lib/kickResolver";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const G = globalThis;
G.__recCache = G.__recCache || new Map();
const CACHE_TTL = 3 * 60 * 1000;

const HEADERS = {
  accept: "application/json, text/plain, */*",
  "accept-language": "en-US,en;q=0.9",
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
};

function parseStreamers(list, excludeSlug) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((s) => s && (s.slug ?? s.channel?.slug) !== excludeSlug)
    .slice(0, 8)
    .map((s) => ({
      slug:       s.slug        ?? s.channel?.slug ?? null,
      username:   s.user?.username ?? s.channel?.user?.username ?? s.slug ?? "?",
      profilePic: s.user?.profile_pic ?? s.channel?.user?.profile_pic ?? null,
      viewers:    s.viewer_count ?? s.viewers_count ?? null,
      title:      s.session_title ?? s.title ?? null,
      category:   s.category?.name ?? s.categories?.[0]?.name ?? null,
      thumbnail:  s.thumbnail?.url ?? (typeof s.thumbnail === "string" ? s.thumbnail : null),
    }))
    .filter((s) => s.slug);
}

async function tryFetch(url) {
  try {
    const r = await fetch(url, { headers: HEADERS, cache: "no-store" });
    if (!r.ok) return null;
    return r.json();
  } catch { return null; }
}

async function fetchViaPuppeteer(url) {
  try {
    const browser = await getBrowser();
    const page    = await browser.newPage();
    try {
      await page.setUserAgent(HEADERS["user-agent"]);
      const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15_000 });
      if (!resp?.ok()) return null;
      return await page.evaluate(() => {
        try { return JSON.parse(document.body.innerText); } catch { return null; }
      });
    } finally {
      page.close().catch(() => {});
    }
  } catch { return null; }
}

async function getStreamers(category, excludeSlug) {
  const key = category || "__featured__";
  const cached = G.__recCache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.value;

  const baseUrl = "https://kick.com/api/v2";
  const urls = category
    ? [`${baseUrl}/categories/${encodeURIComponent(category)}/livestreams?sort=featured&page=1&limit=12`]
    : [`${baseUrl}/channels/featured-live`, `${baseUrl}/livestreams?sort=featured&page=1&limit=12`];

  let streamers = [];
  for (const url of urls) {
    // 1. Try direct fetch
    let data = await tryFetch(url);
    // 2. Fallback to Puppeteer
    if (!data) data = await fetchViaPuppeteer(url);
    if (!data) continue;

    const list = data?.data?.livestreams ?? data?.data ?? data?.livestreams
      ?? (Array.isArray(data) ? data : null);
    if (list?.length) { streamers = parseStreamers(list, excludeSlug); break; }
  }

  G.__recCache.set(key, { value: streamers, ts: Date.now() });
  return streamers;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const category    = searchParams.get("category") || null;
  const excludeSlug = searchParams.get("exclude")  || null;

  try {
    const streamers = await getStreamers(category, excludeSlug);
    return Response.json({ streamers });
  } catch (err) {
    return Response.json({ streamers: [], error: err?.message });
  }
}
