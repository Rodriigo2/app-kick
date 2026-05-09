import { fmtDur, fmtTime } from "./formatters";

// ── Palette ───────────────────────────────────────────────────────────────────
const G   = { GREEN: "#53fc18", DARK: "#080808", PANEL: "#0f0f0f",
               CARD: "#161616", BORDER: "#242424", WHITE: "#f0f0f0",
               MUTED: "#6b7280", DIM: "#374151" };

// ── Canvas helpers ────────────────────────────────────────────────────────────
function rr(ctx, x, y, w, h, r = 10) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function card(ctx, x, y, w, h, r = 10) {
  rr(ctx, x, y, w, h, r);
  ctx.fillStyle = G.CARD; ctx.fill();
  ctx.strokeStyle = G.BORDER; ctx.lineWidth = 1; ctx.stroke();
}

function label(ctx, text, x, y, size = 10, color = G.MUTED, align = "left") {
  ctx.fillStyle = color; ctx.font = `${size}px sans-serif`;
  ctx.textAlign = align; ctx.fillText(text.toUpperCase(), x, y);
}

function value(ctx, text, x, y, size = 28, color = G.WHITE, align = "left", bold = true) {
  ctx.fillStyle = color;
  ctx.font = `${bold ? "bold " : ""}${size}px ${size >= 20 ? "monospace" : "sans-serif"}`;
  ctx.textAlign = align; ctx.fillText(text, x, y);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function exportSessionImage({
  channelInfo, stats, ranking = [], emoteRanking = [],
  lurkerStats, subCount = 0, giftCount = 0,
  peaks = [], topWords = [], timeSeries = [], peakViewerCount = 0,
}) {
  const W = 1000, H = 580;
  const DPR = 2;
  const canvas = document.createElement("canvas");
  canvas.width = W * DPR; canvas.height = H * DPR;
  const ctx = canvas.getContext("2d");
  ctx.scale(DPR, DPR);

  const username     = channelInfo?.user?.username || channelInfo?.slug || "Canal";
  const streamTitle  = channelInfo?.streamTitle ?? null;
  const category     = channelInfo?.streamCategory ?? null;
  const sessionMs    = stats.startedAt ? (stats.stoppedAt ?? Date.now()) - stats.startedAt : 0;
  const peakMoment   = peaks.length ? peaks.reduce((a, b) => b.count > a.count ? b : a) : null;
  const avgMsgsMin   = timeSeries.length > 1
    ? Math.round(timeSeries.reduce((s, d) => s + d.count, 0) / timeSeries.length)
    : null;
  const topChatter   = ranking[0] ?? null;
  const topEmote     = emoteRanking[0] ?? null;
  const date         = new Date(stats.stoppedAt ?? Date.now())
    .toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });

  // ── Background ─────────────────────────────────────────────────────────────
  ctx.fillStyle = G.DARK;
  ctx.fillRect(0, 0, W, H);

  // Left accent strip
  ctx.fillStyle = G.GREEN;
  ctx.fillRect(0, 0, 4, H);

  // ── Header ─────────────────────────────────────────────────────────────────
  const HPAD = 28, HY = 28;

  // Profile pic circle
  if (channelInfo?.user?.profilePic) {
    try {
      const img = await loadImage(channelInfo.user.profilePic);
      ctx.save();
      ctx.beginPath(); ctx.arc(HPAD + 30, HY + 30, 30, 0, Math.PI * 2); ctx.clip();
      ctx.drawImage(img, HPAD, HY, 60, 60);
      ctx.restore();
      ctx.strokeStyle = G.GREEN; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(HPAD + 30, HY + 30, 30, 0, Math.PI * 2); ctx.stroke();
    } catch {}
  }

  // Channel name
  ctx.fillStyle = G.WHITE; ctx.font = "bold 22px sans-serif"; ctx.textAlign = "left";
  ctx.fillText(username, HPAD + 72, HY + 22);

  if (streamTitle) {
    ctx.fillStyle = G.MUTED; ctx.font = "13px sans-serif";
    ctx.fillText(`"${streamTitle.slice(0, 60)}${streamTitle.length > 60 ? "…" : ""}"`, HPAD + 72, HY + 40);
  }
  ctx.fillStyle = G.DIM; ctx.font = "12px sans-serif";
  ctx.fillText(`${date}${category ? "  ·  " + category : ""}`, HPAD + 72, HY + 58);

  // Branding top-right
  ctx.fillStyle = G.GREEN; ctx.font = "bold 14px sans-serif"; ctx.textAlign = "right";
  ctx.fillText("ChatStats", W - HPAD, HY + 22);
  ctx.fillStyle = G.MUTED; ctx.font = "11px sans-serif";
  ctx.fillText("para Kick.com", W - HPAD, HY + 38);

  // ── ROW 1: Hero stats (5 boxes) ────────────────────────────────────────────
  const ROW1Y = 112, ROW1H = 96, PAD = 24, GAP = 10;
  const heroStats = [
    { lbl: "Mensajes totales", val: stats.totalMessages.toLocaleString(), accent: true },
    { lbl: "Usuarios únicos",  val: stats.uniqueUsers.toLocaleString() },
    { lbl: "Duración sesión",  val: fmtDur(sessionMs) || "—" },
    { lbl: "Pico de actividad", val: peakMoment ? `${peakMoment.count}/min` : "—", accent: !!peakMoment },
    { lbl: "Engagement",       val: lurkerStats ? `${lurkerStats.engagementRate}%` : "—" },
  ];
  const bW = (W - PAD * 2 - GAP * (heroStats.length - 1)) / heroStats.length;
  heroStats.forEach((s, i) => {
    const bx = PAD + i * (bW + GAP);
    card(ctx, bx, ROW1Y, bW, ROW1H);
    value(ctx, s.val, bx + bW / 2, ROW1Y + 52, 26, s.accent ? G.GREEN : G.WHITE, "center");
    label(ctx, s.lbl, bx + bW / 2, ROW1Y + ROW1H - 12, 9, G.MUTED, "center");
  });

  // ── ROW 2: Top chatters + Emotes + Words ───────────────────────────────────
  const ROW2Y = ROW1Y + ROW1H + GAP;
  const ROW2H = 200;

  // Top chatters (left, 42%)
  const chatW = (W - PAD * 2) * 0.42;
  card(ctx, PAD, ROW2Y, chatW, ROW2H);
  label(ctx, "Top chatters", PAD + 14, ROW2Y + 20, 9, G.MUTED);

  const medals = ["🥇", "🥈", "🥉", "4.", "5."];
  ranking.slice(0, 5).forEach((u, i) => {
    const ry = ROW2Y + 42 + i * 32;
    const isFirst = i === 0;
    // Bar background
    const barPct = ranking[0]?.count > 0 ? (u.count / ranking[0].count) * 100 : 0;
    ctx.fillStyle = isFirst ? "#53fc1815" : "#ffffff08";
    rr(ctx, PAD + 12, ry - 14, chatW - 24, 24, 4);
    ctx.fill();
    ctx.fillStyle = isFirst ? G.GREEN + "40" : G.BORDER;
    ctx.fillRect(PAD + 12, ry - 14, (chatW - 24) * barPct / 100, 24);

    ctx.fillStyle = isFirst ? G.GREEN : G.WHITE;
    ctx.font = `${isFirst ? "bold " : ""}13px sans-serif`;
    ctx.textAlign = "left";
    ctx.fillText(`${medals[i]}  ${u.username}`, PAD + 18, ry + 4);
    ctx.fillStyle = G.MUTED; ctx.font = "11px monospace"; ctx.textAlign = "right";
    ctx.fillText(`${u.count.toLocaleString()}`, PAD + chatW - 14, ry + 4);
  });

  // Top emotes (middle, 28%)
  const emoteX = PAD + chatW + GAP;
  const emoteW = (W - PAD * 2) * 0.28;
  card(ctx, emoteX, ROW2Y, emoteW, ROW2H);
  label(ctx, "Top emotes", emoteX + 14, ROW2Y + 20, 9, G.MUTED);

  for (let i = 0; i < Math.min(4, emoteRanking.length); i++) {
    const e  = emoteRanking[i];
    const ey = ROW2Y + 40 + i * 40;
    if (e.url) {
      try {
        const img = await loadImage(e.url);
        ctx.drawImage(img, emoteX + 14, ey, 28, 28);
      } catch {}
    }
    ctx.fillStyle = i === 0 ? G.WHITE : G.MUTED;
    ctx.font = `${i === 0 ? "bold " : ""}12px sans-serif`;
    ctx.textAlign = "left";
    ctx.fillText(e.name, emoteX + 50, ey + 18);
    ctx.fillStyle = G.DIM; ctx.font = "11px monospace"; ctx.textAlign = "right";
    ctx.fillText(`×${e.count}`, emoteX + emoteW - 14, ey + 18);
  }

  // Top words (right, 28%)
  const wordX = emoteX + emoteW + GAP;
  const wordW = W - PAD - wordX;
  card(ctx, wordX, ROW2Y, wordW, ROW2H);
  label(ctx, "Palabras del chat", wordX + 14, ROW2Y + 20, 9, G.MUTED);

  topWords.slice(0, 7).forEach((w, i) => {
    const wy   = ROW2Y + 38 + i * 24;
    const pct  = (w.count / (topWords[0]?.count || 1)) * 100;
    ctx.fillStyle = "#53fc1812";
    ctx.fillRect(wordX + 12, wy - 2, (wordW - 24) * pct / 100, 18);
    ctx.fillStyle = i < 3 ? G.WHITE : G.MUTED;
    ctx.font = `${i === 0 ? "bold " : ""}12px sans-serif`;
    ctx.textAlign = "left";
    ctx.fillText(w.word, wordX + 16, wy + 12);
    ctx.fillStyle = G.DIM; ctx.font = "10px monospace"; ctx.textAlign = "right";
    ctx.fillText(w.count, wordX + wordW - 14, wy + 12);
  });

  // ── ROW 3: Extra stats strip ────────────────────────────────────────────────
  const ROW3Y = ROW2Y + ROW2H + GAP;
  const ROW3H = 64;
  const strips = [
    peakViewerCount > 0 && { lbl: "Pico de viewers", val: peakViewerCount.toLocaleString(), accent: true },
    lurkerStats && { lbl: "Chatters", val: lurkerStats.chatters.toLocaleString() },
    lurkerStats && { lbl: "Lurkers",  val: lurkerStats.lurkers.toLocaleString() },
    avgMsgsMin  && { lbl: "Msgs/min promedio", val: `${avgMsgsMin}` },
    peakMoment  && { lbl: "Pico a las", val: fmtTime(peakMoment.ts) },
    (subCount + giftCount) > 0 && { lbl: "Subs totales", val: `${subCount + giftCount}`, accent: true },
    giftCount > 0 && { lbl: "Gifted subs", val: `${giftCount}`, accent: true },
  ].filter(Boolean);

  if (strips.length) {
    const sw = (W - PAD * 2 - GAP * (strips.length - 1)) / strips.length;
    strips.forEach((s, i) => {
      const sx = PAD + i * (sw + GAP);
      card(ctx, sx, ROW3Y, sw, ROW3H, 8);
      value(ctx, s.val, sx + sw / 2, ROW3Y + 34, 18, s.accent ? G.GREEN : G.WHITE, "center");
      label(ctx, s.lbl, sx + sw / 2, ROW3Y + ROW3H - 10, 9, G.MUTED, "center");
    });
  }

  // ── Footer ─────────────────────────────────────────────────────────────────
  ctx.fillStyle = G.BORDER;
  ctx.fillRect(0, H - 26, W, 26);
  ctx.fillStyle = G.DIM; ctx.font = "10px sans-serif"; ctx.textAlign = "center";
  ctx.fillText("Generado con ChatStats · Análisis de chat para Kick.com", W / 2, H - 9);

  // ── Download ───────────────────────────────────────────────────────────────
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chatstats-${username}-${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}
