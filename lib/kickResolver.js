import puppeteer from "puppeteer";

// Singleton across HMR reloads in dev.
const G = globalThis;
G.__kickBrowser = G.__kickBrowser || null;
G.__kickBrowserPromise = G.__kickBrowserPromise || null;
G.__kickCache = G.__kickCache || new Map(); // slug -> { value, ts }
G.__kickHistoryPage = G.__kickHistoryPage || null;
G.__kickHistoryPagePromise = G.__kickHistoryPagePromise || null;

const CACHE_TTL_MS = 60 * 60 * 1000;
const NAV_TIMEOUT_MS = 25_000;

function parseKickTimestamp(s) {
  if (!s || typeof s !== "string") return null;
  const normalized = /[Tt]/.test(s)
    ? s
    : s.replace(" ", "T") + (s.endsWith("Z") ? "" : "Z");
  const ms = Date.parse(normalized);
  return Number.isFinite(ms) ? ms : null;
}

// Build a consistent channel info object from a raw Kick API response.
// kickUserId = data.user.id — this is what 7TV uses as the platform connection ID,
// distinct from data.id (channel ID) or data.chatroom.id (chatroom ID).
function buildChannelInfo(slug, data, source) {
  const chatroomId = data?.chatroom?.id ?? data?.chatroom_id ?? null;
  if (!chatroomId) return null;
  const ls = data?.livestream ?? null;
  return {
    slug,
    chatroomId,
    channelId:     data?.id ?? null,
    kickUserId:    data?.user?.id ?? data?.id ?? null,
    user: data?.user ? {
      username:  data.user.username,
      profilePic: data.user.profile_pic ?? null,
      bio:       data.user.bio ?? null,
      instagram: data.user.instagram ?? null,
      twitter:   data.user.twitter ?? null,
      youtube:   data.user.youtube ?? null,
      discord:   data.user.discord ?? null,
      tiktok:    data.user.tiktok ?? null,
      facebook:  data.user.facebook ?? null,
    } : { username: slug, profilePic: null },
    isLive:        Boolean(ls),
    liveStartedAt: parseKickTimestamp(ls?.created_at),
    streamTitle:   ls?.session_title ?? null,
    streamCategory: ls?.category?.name ?? ls?.categories?.[0]?.name ?? null,
    viewerCount:   ls?.viewer_count ?? null,
    streamTags:    (data?.tags ?? ls?.tags ?? []).filter(Boolean),
    verified:      Boolean(data?.verified ?? data?.user?.verified),
    followersCount: data?.followers_count ?? data?.chatroom?.followers_count ?? null,
    // subscriber_badges: sorted by months, each has months + badge image URL
    subscriberBadges: (data?.subscriber_badges ?? [])
      .sort((a, b) => a.months - b.months)
      .map((b) => ({ months: b.months, url: b.badge_image?.src ?? null })),
    source,
  };
}

async function getBrowser() {
  if (G.__kickBrowser && G.__kickBrowser.connected) return G.__kickBrowser;
  if (G.__kickBrowserPromise) return G.__kickBrowserPromise;

  G.__kickBrowserPromise = puppeteer
    .launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
        "--disable-dev-shm-usage",
        "--no-first-run",
        "--no-default-browser-check",
      ],
      defaultViewport: { width: 1280, height: 800 },
    })
    .then((b) => {
      G.__kickBrowser = b;
      b.on("disconnected", () => {
        G.__kickBrowser = null;
        G.__kickBrowserPromise = null;
      });
      return b;
    })
    .catch((err) => {
      G.__kickBrowserPromise = null;
      throw err;
    });

  return G.__kickBrowserPromise;
}

function extractChatroomId(html) {
  if (!html) return null;
  let m = html.match(/"chatroom"\s*:\s*\{[^}]*?"id"\s*:\s*(\d+)/);
  if (m) return Number(m[1]);
  m = html.match(/"chatroom_id"\s*:\s*(\d+)/);
  if (m) return Number(m[1]);
  return null;
}

function extractUsername(html, fallbackSlug) {
  if (!html) return fallbackSlug;
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i);
  if (og) { const n = og[1].split("|")[0].split(" - ")[0].trim(); if (n) return n; }
  const t = html.match(/<title>([^<]+)<\/title>/i);
  if (t) { const n = t[1].split("|")[0].split(" - ")[0].trim(); if (n) return n; }
  return fallbackSlug;
}

const VALID_SLUG = /^[a-z0-9_-]{1,64}$/;

export async function resolveKickChannel(rawSlug) {
  const slug = String(rawSlug || "").trim().toLowerCase();
  if (!slug) throw new Error("Slug vacío");
  if (!VALID_SLUG.test(slug)) throw new Error("Nombre de canal inválido");

  const cached = G.__kickCache.get(slug);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return { ...cached.value, cached: true };
  }

  // Attempt 1: cheap Node fetch (works on some networks)
  try {
    const r = await fetch(
      `https://kick.com/api/v2/channels/${encodeURIComponent(slug)}`,
      {
        headers: {
          accept: "application/json, text/plain, */*",
          "accept-language": "en-US,en;q=0.9",
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        },
        cache: "no-store",
      }
    );
    if (r.ok) {
      const data = await r.json();
      const value = buildChannelInfo(slug, data, "api");
      if (value) {
        G.__kickCache.set(slug, { value, ts: Date.now() });
        return value;
      }
    }
  } catch { /* fall through to puppeteer */ }

  // Puppeteer fallback
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    );
    await page.setExtraHTTPHeaders({ "accept-language": "en-US,en;q=0.9" });

    // Strategy A: JSON API via browser TLS fingerprint
    let info = null;
    try {
      const resp = await page.goto(
        `https://kick.com/api/v2/channels/${encodeURIComponent(slug)}`,
        { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS }
      );
      if (resp?.ok()) {
        const body = await page.evaluate(() => {
          try { return JSON.parse(document.body.innerText); } catch { return null; }
        });
        info = buildChannelInfo(slug, body, "puppeteer-api");
      }
    } catch { /* try strategy B */ }

    // Strategy B: HTML scrape
    if (!info) {
      const resp = await page.goto(
        `https://kick.com/${encodeURIComponent(slug)}`,
        { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS }
      );
      if (!resp?.ok()) throw new Error(`Kick devolvió ${resp?.status() ?? "?"} al cargar /${slug}`);

      await page
        .waitForFunction(
          () => /chatroom"\s*:\s*\{[^}]*"id"\s*:\s*\d+/.test(document.documentElement.innerHTML),
          { timeout: 8000 }
        )
        .catch(() => {});

      const html = await page.content();
      const chatroomId = extractChatroomId(html);
      if (!chatroomId) throw new Error("No se encontró chatroom_id en la página");

      info = {
        slug,
        chatroomId,
        channelId:   null,
        kickUserId:  null,
        user:        { username: extractUsername(html, slug), profilePic: null },
        isLive:      /"livestream"\s*:\s*\{/.test(html),
        liveStartedAt: null,
        source:      "puppeteer-html",
      };
    }

    G.__kickCache.set(slug, { value: info, ts: Date.now() });
    return info;
  } finally {
    page.close().catch(() => {});
  }
}

async function getHistoryPage() {
  if (G.__kickHistoryPage && !G.__kickHistoryPage.isClosed()) return G.__kickHistoryPage;
  if (G.__kickHistoryPagePromise) return G.__kickHistoryPagePromise;

  G.__kickHistoryPagePromise = (async () => {
    const browser = await getBrowser();
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    );
    await page.goto("https://kick.com/", { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
    G.__kickHistoryPage = page;
    page.on("close", () => { if (G.__kickHistoryPage === page) G.__kickHistoryPage = null; });
    return page;
  })().catch((err) => { G.__kickHistoryPagePromise = null; throw err; });

  const page = await G.__kickHistoryPagePromise;
  G.__kickHistoryPagePromise = null;
  return page;
}

export async function fetchKickLeaderboard(channelId, slug) {
  if (!channelId && !slug) return null;
  const page = await getHistoryPage();

  const result = await page.evaluate(async (cid, sl) => {
    const out = {};

    // 1) Gifted subs leaderboard (v2 public API)
    if (sl) {
      try {
        const r = await fetch(`/api/v2/channels/${sl}/leaderboards`,
          { headers: { accept: "application/json" } });
        if (r.ok) {
          const d = await r.json();
          out.gifts = (d?.gifts ?? []).slice(0, 20);
        }
      } catch {}
    }

    // 2) Kicks virtual currency leaderboard
    if (cid) {
      try {
        const r = await fetch(
          `https://web.kick.com/api/v1/kicks/${cid}/leaderboard`,
          { headers: { accept: "application/json" }, credentials: "include" }
        );
        if (r.ok) {
          const d = await r.json();
          const k = d?.data ?? {};
          out.lifetime = (k.kicks_gifts_lifetime ?? []).slice(0, 20);
          out.session  = (k.kicks_gifts_session  ?? []).slice(0, 20);
          out.monthly  = (k.kicks_gifts_monthly  ?? []).slice(0, 20);
          out.weekly   = (k.kicks_gifts_weekly   ?? []).slice(0, 20);
        }
      } catch {}
    }

    return out;
  }, channelId, slug);

  return result;
}

export async function fetchKickHistoryBatch(chatroomId, startCursor, batchPages = 10) {
  if (!chatroomId) throw new Error("chatroomId requerido");

  const page = await getHistoryPage();

  const result = await page.evaluate(
    async (chatroomId, startCursor, batchPages) => {
      const allMessages = [];
      let cursor = startCursor || null;
      let fetched = 0;
      let error = null;

      while (fetched < batchPages) {
        const url = cursor
          ? `https://web.kick.com/api/v1/chat/${chatroomId}/history?cursor=${encodeURIComponent(cursor)}`
          : `https://web.kick.com/api/v1/chat/${chatroomId}/history`;
        try {
          const r = await fetch(url, { headers: { accept: "application/json" }, credentials: "include" });
          if (!r.ok) { error = `HTTP ${r.status}`; break; }
          const data = await r.json();
          const msgs = data?.data?.messages || [];
          cursor = data?.data?.cursor || null;
          allMessages.push(...msgs);
          fetched += 1;
          if (!cursor) break;
        } catch (e) { error = String(e); break; }
      }

      return { messages: allMessages, cursor, fetched, error };
    },
    chatroomId, startCursor, batchPages
  );

  if (result.error && result.messages.length === 0) {
    throw new Error(`history batch error: ${result.error}`);
  }

  return { messages: result.messages, cursor: result.cursor, pagesFetched: result.fetched };
}
