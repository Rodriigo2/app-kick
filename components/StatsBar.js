"use client";

import { useEffect, useState } from "react";
import { fmtTime, fmtDur, fmtDurFull, fmtN as fmtCount } from "@/lib/formatters";

function formatDuration(ms) {
  return fmtDurFull(ms);
}

const STATUS_CFG = {
  idle:       { dot: "bg-neutral-500",             label: "Sin conectar"        },
  connecting: { dot: "bg-yellow-400 animate-pulse", label: "Conectando…"        },
  connected:  { dot: "bg-kick-green animate-pulse", label: "En vivo"            },
  waiting:    { dot: "bg-blue-400 animate-pulse",   label: "Esperando directo…" },
  error:      { dot: "bg-red-500",                  label: "Error"              },
  stopped:    { dot: "bg-neutral-400",              label: "Detenido"           },
};

const SOCIAL_ICONS = {
  instagram: "IG", twitter: "𝕏", youtube: "YT",
  discord: "DC", tiktok: "TT", facebook: "FB",
};

export default function StatsBar({ status, channelInfo, stats, titleChanges = [], categoryHistory = [], onRefresh, isPriority, onSetPriority }) {
  const [now, setNow]         = useState(() => Date.now());
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!channelInfo) return null;

  const cfg       = STATUS_CFG[status] ?? STATUS_CFG.idle;
  const streamMs  = channelInfo.liveStartedAt != null ? now - channelInfo.liveStartedAt : null;
  const sessionMs = stats.startedAt != null ? (stats.stoppedAt ?? now) - stats.startedAt : 0;

  const username  = channelInfo.user?.username || channelInfo.slug;
  const profilePic = channelInfo.user?.profilePic;
  const verified  = channelInfo.verified ?? false;

  const socials = [
    channelInfo.user?.instagram && { type: "instagram", handle: channelInfo.user.instagram, url: `https://instagram.com/${channelInfo.user.instagram}` },
    channelInfo.user?.twitter   && { type: "twitter",   handle: channelInfo.user.twitter,   url: `https://x.com/${channelInfo.user.twitter}` },
    channelInfo.user?.youtube   && { type: "youtube",   handle: channelInfo.user.youtube,   url: channelInfo.user.youtube.startsWith("http") ? channelInfo.user.youtube : `https://youtube.com/@${channelInfo.user.youtube}` },
    channelInfo.user?.discord   && { type: "discord",   handle: channelInfo.user.discord,   url: channelInfo.user.discord.startsWith("http") ? channelInfo.user.discord : `https://discord.gg/${channelInfo.user.discord}` },
    channelInfo.user?.tiktok    && { type: "tiktok",    handle: channelInfo.user.tiktok,    url: `https://tiktok.com/@${channelInfo.user.tiktok}` },
    channelInfo.user?.facebook  && { type: "facebook",  handle: channelInfo.user.facebook,  url: `https://facebook.com/${channelInfo.user.facebook}` },
  ].filter(Boolean);

  const tags      = channelInfo.streamTags ?? [];
  const bio       = channelInfo.user?.bio ?? null;
  const hasExtra  = bio || socials.length > 0 || tags.length > 0 || titleChanges.length > 0;

  return (
    <div className="rounded-xl border border-kick-border bg-kick-panel px-4 py-3">
      {/* ── Main row ─────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        {/* Avatar */}
        {profilePic ? (
          <img src={profilePic} alt={username}
            className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-kick-border" />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-kick-green/20 text-base font-bold text-kick-green">
            {username[0]?.toUpperCase()}
          </div>
        )}

        {/* Identity + meta */}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            {onSetPriority && (
              <button onClick={onSetPriority}
                title={isPriority ? "Quitar prioritario" : "Marcar como prioritario"}
                className={`text-sm transition ${isPriority ? "text-yellow-400" : "text-neutral-700 hover:text-yellow-400"}`}>
                ⚡
              </button>
            )}
            <a href={`https://kick.com/${channelInfo.slug}`} target="_blank" rel="noopener noreferrer"
              className="text-base font-bold text-neutral-100 transition hover:text-kick-green truncate">
              {username}
            </a>
            {verified && (
              <svg width="14" height="14" viewBox="0 0 16 16" className="shrink-0 text-kick-green" fill="currentColor">
                <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm3.5 6.5-4 4a.75.75 0 0 1-1.06 0l-2-2a.75.75 0 1 1 1.06-1.06L7 8.94l3.47-3.47a.75.75 0 1 1 1.06 1.06z"/>
              </svg>
            )}
            <div className="flex items-center gap-1 text-[11px] text-neutral-500">
              <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </div>
            {channelInfo.viewerCount != null && (
              <span className="font-mono text-[11px] text-neutral-500">
                {channelInfo.viewerCount.toLocaleString()} viewers
              </span>
            )}
          </div>

          {/* Stream title + meta row */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0 text-[11px] text-neutral-500">
            {channelInfo.streamTitle && (
              <span className="truncate text-neutral-400 max-w-[320px]">{channelInfo.streamTitle}</span>
            )}
            {channelInfo.streamCategory && (
              <span className="flex items-center gap-1">
                <span className="h-1 w-1 rounded-full bg-kick-green/60" />
                {channelInfo.streamCategory}
              </span>
            )}
            {streamMs != null && <span className="font-mono">🕐 {formatDuration(streamMs)}</span>}
            {sessionMs > 0 && (
              <span className={`font-mono ${stats.stoppedAt ? "text-red-400/60" : ""}`}>
                {stats.stoppedAt ? "⏹ " : "📡 "}{formatDuration(sessionMs)}
              </span>
            )}
            {channelInfo.followersCount != null && (
              <span>{fmtCount(channelInfo.followersCount)} seguidores</span>
            )}
          </div>
        </div>

        {/* Right: stats + controls */}
        <div className="flex shrink-0 items-center gap-4">
          <div className="flex items-center gap-4 divide-x divide-kick-border">
            <div className="flex flex-col items-end">
              <span className="font-mono text-lg font-bold tabular-nums text-neutral-100">{stats.totalMessages.toLocaleString()}</span>
              <span className="text-[10px] uppercase tracking-wider text-neutral-600">msgs</span>
            </div>
            <div className="flex flex-col items-end pl-4">
              <span className="font-mono text-lg font-bold tabular-nums text-neutral-100">{stats.uniqueUsers.toLocaleString()}</span>
              <span className="text-[10px] uppercase tracking-wider text-neutral-600">users</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1">
            {onRefresh && (
              <button onClick={onRefresh} title="Actualizar info"
                className="rounded-lg p-1.5 text-neutral-600 transition hover:text-kick-green">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                  <path d="M21 3v5h-5M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                </svg>
              </button>
            )}
            {hasExtra && (
              <button onClick={() => setExpanded((v) => !v)}
                title={expanded ? "Menos info" : "Más info"}
                className={`rounded-lg p-1.5 text-xs transition ${expanded ? "text-kick-green" : "text-neutral-600 hover:text-neutral-300"}`}>
                {expanded ? "▲" : "▼"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Expandable details ───────────────────────────── */}
      {expanded && hasExtra && (
        <div className="mt-3 flex flex-col gap-2 border-t border-kick-border pt-3">
          {bio && <p className="text-xs italic text-neutral-500">{bio}</p>}

          {(socials.length > 0 || tags.length > 0) && (
            <div className="flex flex-wrap items-center gap-1.5">
              {socials.map((s) => (
                <a key={s.type} href={s.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded border border-kick-border bg-white/5 px-2 py-0.5 text-[10px] text-neutral-400 hover:border-kick-green/40 hover:text-neutral-200">
                  <span className="font-bold">{SOCIAL_ICONS[s.type]}</span>
                  <span>{s.handle}</span>
                </a>
              ))}
              {tags.map((tag) => (
                <span key={tag} className="rounded-full border border-kick-border bg-white/5 px-2 py-0.5 text-[10px] text-neutral-500">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {titleChanges.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-[10px] uppercase tracking-wide text-neutral-600">Cambios de título ({titleChanges.length})</p>
              {titleChanges.map((c, i) => (
                <div key={i} className="flex items-start gap-2 text-[11px]">
                  <span className="shrink-0 font-mono text-neutral-600">{fmtTime(c.ts)}</span>
                  <span className="truncate text-neutral-600 line-through">{c.from}</span>
                  <span className="truncate text-neutral-400">→ {c.to}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
