"use client";

import { useState, useEffect } from "react";
import { getUserTopEmote, getUserLastMessage, getUserJourney, getUserGiftCount } from "@/lib/chatSession";
import { fmtTime, fmtDate } from "@/lib/formatters";
import Modal from "./Modal";
import ViewerJourney from "./ViewerJourney";
import MessageRenderer from "./MessageRenderer";

function Stat({ label, value, accent }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-kick-border bg-black/40 px-4 py-3">
      <span className="text-xs uppercase tracking-wide text-neutral-500">{label}</span>
      <span className={`font-mono text-xl font-semibold ${accent ? "text-kick-green" : "text-neutral-100"}`}>{value}</span>
    </div>
  );
}

export default function UserModal({ user, rank, totalMessages, emoteMap = {}, onClose }) {
  const [profilePic, setProfilePic] = useState(null);

useEffect(() => {
    if (!user?.username) return;
    fetch(`/api/channel/${encodeURIComponent(user.username)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.user?.profilePic) setProfilePic(d.user.profilePic); })
      .catch(() => {});
  }, [user?.username]);

  if (!user) return null;

  const pct         = totalMessages > 0 ? ((user.count / totalMessages) * 100).toFixed(2) : "0.00";
  const durationMin = (user.lastSeen - user.firstSeen) / 60_000;
  const avgLabel    = durationMin > 0.5 ? `${(user.count / durationMin).toFixed(1)} msgs/min` : `${user.count} msgs`;
  const rankBadge   = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;
  const topEmote    = getUserTopEmote(user.username);
  const lastMsg     = getUserLastMessage(user.username);
  const journey     = getUserJourney(user.username);
  const giftsSent   = getUserGiftCount(user.username);

  return (
    <Modal onClose={onClose}>
      {/* Header */}
      <div className="flex items-start justify-between border-b border-kick-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            {profilePic ? (
              <img src={profilePic} alt={user.username} className="h-12 w-12 rounded-full object-cover ring-2 ring-kick-border" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-xl font-bold text-neutral-300 ring-2 ring-kick-border">
                {user.username[0]?.toUpperCase()}
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-kick-panel text-sm leading-none ring-1 ring-kick-border">
              {rankBadge}
            </span>
          </div>
          <div>
            <div className="text-base font-semibold text-neutral-100">{user.username}</div>
            <div className="text-xs text-neutral-500">{fmtDate(user.firstSeen)} · {fmtTime(user.firstSeen)} → {fmtTime(user.lastSeen)}</div>
          </div>
        </div>
        <button onClick={onClose} className="rounded-lg p-1 text-neutral-500 hover:bg-white/5 hover:text-neutral-200">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 p-6 pb-4">
        <Stat label="Mensajes"      value={user.count.toLocaleString()} accent />
        <Stat label="% del chat"    value={`${pct}%`} />
        <Stat label="Promedio"      value={avgLabel} />
        <Stat label="Rank"          value={`#${rank}`} />
        {journey && <Stat label="Viewer Score"   value={journey.score.toLocaleString()} accent />}
        {journey && <Stat label="Minutos activo" value={`${journey.activeMin} / ${journey.totalMin}`} />}
        {giftsSent > 0 && (
          <div className="col-span-2 flex items-center gap-3 rounded-lg border border-purple-500/30 bg-purple-500/10 px-4 py-3">
            <span className="text-xl">🎁</span>
            <div>
              <div className="text-sm font-semibold text-purple-300">{giftsSent} sub{giftsSent !== 1 ? "s" : ""} regalada{giftsSent !== 1 ? "s" : ""}</div>
              <div className="text-xs text-neutral-500">durante esta sesión</div>
            </div>
          </div>
        )}
        {user.streak >= 2 && (
          <div className="col-span-2 flex items-center gap-2 rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-2">
            <span className="text-lg">🔥</span>
            <div>
              <div className="text-sm font-semibold text-orange-400">Racha de {user.streak} minuto{user.streak !== 1 ? "s" : ""}</div>
              <div className="text-xs text-neutral-500">Activo en los últimos {user.streak} minutos consecutivos</div>
            </div>
          </div>
        )}
      </div>

      {journey && journey.buckets.length > 1 && <ViewerJourney journey={journey} />}

      {lastMsg && (
        <div className="mx-6 mb-3 rounded-lg border border-kick-border bg-black/40 px-4 py-3">
          <div className="mb-1.5 text-xs uppercase tracking-wide text-neutral-500">Último mensaje</div>
          <div className="break-all text-sm text-neutral-200"><MessageRenderer content={lastMsg} emoteMap={emoteMap} /></div>
        </div>
      )}

      {topEmote && (
        <div className="mx-6 mb-4 flex items-center gap-3 rounded-lg border border-kick-border bg-black/40 px-4 py-3">
          <div className="text-xs uppercase tracking-wide text-neutral-500 shrink-0">Emote favorito</div>
          <div className="flex flex-1 items-center justify-end gap-2">
            {topEmote.url && <img src={topEmote.url} alt={topEmote.name} className="h-7 w-auto object-contain" />}
            <span className="font-mono text-sm font-semibold text-neutral-100">{topEmote.name}</span>
            <span className="font-mono text-xs text-neutral-500">×{topEmote.count}</span>
          </div>
        </div>
      )}

      <div className="flex justify-between px-6 pb-6 font-mono text-xs text-neutral-500">
        <span>Primer msg: {fmtTime(user.firstSeen)}</span>
        <span>Último msg: {fmtTime(user.lastSeen)}</span>
      </div>
    </Modal>
  );
}
