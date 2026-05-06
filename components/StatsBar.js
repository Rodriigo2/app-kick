"use client";

import { useEffect, useState } from "react";

function formatDuration(ms) {
  if (!ms || ms < 0) return "00:00:00";
  const total = Math.floor(ms / 1000);
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const STATUS_CFG = {
  idle:       { dot: "bg-neutral-500",              label: "Sin conectar" },
  connecting: { dot: "bg-yellow-400 animate-pulse",  label: "Conectando…"  },
  connected:  { dot: "bg-kick-green animate-pulse",  label: "En vivo"      },
  error:      { dot: "bg-red-500",                   label: "Error"        },
  stopped:    { dot: "bg-neutral-400",               label: "Detenido"     },
};

function StatPill({ label, value }) {
  return (
    <div className="flex flex-col items-end">
      <span className="font-mono text-xl font-bold tabular-nums text-neutral-100">{value}</span>
      <span className="text-[10px] uppercase tracking-wider text-neutral-500">{label}</span>
    </div>
  );
}

function VerifiedBadge() {
  return (
    <svg
      title="Canal verificado"
      width="16" height="16" viewBox="0 0 16 16"
      className="shrink-0 text-kick-green"
      fill="currentColor"
    >
      <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm3.5 6.5-4 4a.75.75 0 0 1-1.06 0l-2-2a.75.75 0 1 1 1.06-1.06L7 8.94l3.47-3.47a.75.75 0 1 1 1.06 1.06z" />
    </svg>
  );
}

export default function StatsBar({ status, channelInfo, stats, titleChanges = [], onRefresh }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const cfg = STATUS_CFG[status] ?? STATUS_CFG.idle;

  const streamMs = channelInfo?.liveStartedAt != null
    ? now - channelInfo.liveStartedAt
    : null;

  if (!channelInfo) return null;

  const profilePic     = channelInfo.user?.profilePic;
  const username       = channelInfo.user?.username || channelInfo.slug;
  const tags           = channelInfo.streamTags ?? [];
  const verified       = channelInfo.verified ?? false;
  const followersCount = channelInfo.followersCount ?? null;
  const bio            = channelInfo.user?.bio ?? null;
  const socials        = [
    channelInfo.user?.instagram && { type: "instagram", handle: channelInfo.user.instagram, url: `https://instagram.com/${channelInfo.user.instagram}`, icon: "IG" },
    channelInfo.user?.twitter   && { type: "twitter",   handle: channelInfo.user.twitter,   url: `https://x.com/${channelInfo.user.twitter}`,           icon: "𝕏"  },
    channelInfo.user?.youtube   && { type: "youtube",   handle: channelInfo.user.youtube,   url: channelInfo.user.youtube.startsWith("http") ? channelInfo.user.youtube : `https://youtube.com/@${channelInfo.user.youtube}`, icon: "YT" },
    channelInfo.user?.discord   && { type: "discord",   handle: channelInfo.user.discord,   url: channelInfo.user.discord.startsWith("http") ? channelInfo.user.discord : `https://discord.gg/${channelInfo.user.discord}`,   icon: "DC" },
    channelInfo.user?.tiktok    && { type: "tiktok",    handle: channelInfo.user.tiktok,    url: `https://tiktok.com/@${channelInfo.user.tiktok}`,       icon: "TT" },
    channelInfo.user?.facebook  && { type: "facebook",  handle: channelInfo.user.facebook,  url: `https://facebook.com/${channelInfo.user.facebook}`,    icon: "FB" },
  ].filter(Boolean);

  const fmtCount = (n) => {
    if (n === null || n === undefined) return null;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString();
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-kick-border bg-kick-panel px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        {/* Left: channel identity */}
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {profilePic ? (
            <img src={profilePic} alt={username}
              className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-kick-border" />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-kick-green/20 text-lg font-bold text-kick-green">
              {username[0]?.toUpperCase()}
            </div>
          )}

          <div className="min-w-0 flex-1">
            {/* Name + verified + status + viewers */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <a
                href={`https://kick.com/${channelInfo.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xl font-bold text-neutral-100 hover:text-kick-green transition-colors truncate"
                title="Ver directo en Kick"
              >
                {username}
              </a>
              {verified && <VerifiedBadge />}
              <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                {cfg.label}
              </div>
              {channelInfo.viewerCount != null && (
                <span className="rounded-full bg-white/5 px-2 py-0.5 font-mono text-xs text-neutral-400">
                  {channelInfo.viewerCount.toLocaleString()} viewers
                </span>
              )}
              {followersCount !== null && (
                <span className="rounded-full bg-white/5 px-2 py-0.5 font-mono text-xs text-neutral-400">
                  {fmtCount(followersCount)} seguidores
                </span>
              )}
            </div>

            {/* Stream title */}
            {channelInfo.streamTitle && (
              <p className="mt-0.5 truncate text-sm text-neutral-300" title={channelInfo.streamTitle}>
                {channelInfo.streamTitle}
              </p>
            )}

            {/* Category + durations */}
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-neutral-500">
              {channelInfo.streamCategory && (
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-kick-green/60" />
                  {channelInfo.streamCategory}
                </span>
              )}
              {streamMs !== null && (
                <span className="font-mono">stream {formatDuration(streamMs)}</span>
              )}
            </div>

            {/* Bio */}
            {bio && (
              <p className="mt-1 text-xs text-neutral-400 italic">{bio}</p>
            )}

            {/* Social links */}
            {socials.length > 0 && (
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {socials.map((s) => (
                  <a
                    key={s.type}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`${s.type}: ${s.handle}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 rounded border border-kick-border bg-white/5 px-2 py-0.5 text-[11px] text-neutral-400 hover:border-kick-green/40 hover:text-neutral-200"
                  >
                    <span className="font-bold">{s.icon}</span>
                    <span>{s.handle}</span>
                  </a>
                ))}
              </div>
            )}

            {/* Tags + refresh button */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {tags.map((tag) => (
                <span key={tag}
                  className="rounded-full border border-kick-border bg-white/5 px-2 py-0.5 text-[11px] text-neutral-400">
                  {tag}
                </span>
              ))}
              {onRefresh && (
                <button onClick={onRefresh} title="Actualizar título, etiquetas y viewers"
                  className="rounded-full border border-kick-border bg-white/5 px-2 py-0.5 text-[11px] text-neutral-500 hover:border-kick-green/50 hover:text-kick-green">
                  ↻
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right: key stats */}
        <div className="flex shrink-0 items-center gap-6 divide-x divide-kick-border">
          <StatPill label="Mensajes" value={stats.totalMessages.toLocaleString()} />
          <div className="pl-6">
            <StatPill label="Usuarios" value={stats.uniqueUsers.toLocaleString()} />
          </div>
        </div>
      </div>

      {/* Title change history */}
      {titleChanges.length > 0 && (
        <div className="flex flex-col gap-1 border-t border-kick-border pt-3">
          <p className="text-[10px] uppercase tracking-wide text-neutral-500">Cambios de título</p>
          {titleChanges.map((c, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <span className="shrink-0 font-mono text-neutral-600">{fmtTime(c.ts)}</span>
              <span className="text-neutral-500 line-through truncate">{c.from}</span>
              <span className="text-neutral-300 truncate">→ {c.to}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
