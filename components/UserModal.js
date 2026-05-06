"use client";

import { useEffect } from "react";
import { getUserTopEmote, getUserLastMessage } from "@/lib/chatSession";
import MessageRenderer from "./MessageRenderer";

function Stat({ label, value, accent }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-kick-border bg-black/40 px-4 py-3">
      <span className="text-xs uppercase tracking-wide text-neutral-500">{label}</span>
      <span className={`font-mono text-xl font-semibold ${accent ? "text-kick-green" : "text-neutral-100"}`}>
        {value}
      </span>
    </div>
  );
}

function fmtTime(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function fmtDate(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString([], { day: "2-digit", month: "short" });
}

export default function UserModal({ user, rank, totalMessages, emoteMap = {}, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!user) return null;

  const pct         = totalMessages > 0 ? ((user.count / totalMessages) * 100).toFixed(2) : "0.00";
  const durationMs  = user.lastSeen - user.firstSeen;
  const durationMin = durationMs / 60_000;
  const avgLabel    = durationMin > 0.5
    ? `${(user.count / durationMin).toFixed(1)} msgs/min`
    : `${user.count} msgs`;

  const rankBadge = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;
  const topEmote   = getUserTopEmote(user.username);
  const lastMsg    = getUserLastMessage(user.username);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-2xl border border-kick-border bg-kick-panel shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-kick-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-lg">
              {rankBadge}
            </div>
            <div>
              <div className="text-base font-semibold text-neutral-100">{user.username}</div>
              <div className="text-xs text-neutral-500">
                {fmtDate(user.firstSeen)} · {fmtTime(user.firstSeen)} → {fmtTime(user.lastSeen)}
              </div>
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
          <Stat label="Mensajes" value={user.count.toLocaleString()} accent />
          <Stat label="% del chat"  value={`${pct}%`} />
          <Stat label="Promedio"    value={avgLabel} />
          <Stat label="Rank"        value={`#${rank}`} />
          {user.streak >= 2 && (
            <div className="col-span-2 flex items-center gap-2 rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-2">
              <span className="text-lg">🔥</span>
              <div>
                <div className="text-sm font-semibold text-orange-400">
                  Racha de {user.streak} minuto{user.streak !== 1 ? "s" : ""}
                </div>
                <div className="text-xs text-neutral-500">
                  Activo en los últimos {user.streak} minutos consecutivos
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Last message */}
        {lastMsg && (
          <div className="mx-6 mb-3 rounded-lg border border-kick-border bg-black/40 px-4 py-3">
            <div className="mb-1.5 text-xs uppercase tracking-wide text-neutral-500">Último mensaje</div>
            <div className="break-all text-sm text-neutral-200">
              <MessageRenderer content={lastMsg} emoteMap={emoteMap} />
            </div>
          </div>
        )}

        {/* Top emote */}
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

        {/* First / last message times */}
        <div className="flex justify-between px-6 pb-6 font-mono text-xs text-neutral-500">
          <span>Primer msg: {fmtTime(user.firstSeen)}</span>
          <span>Último msg: {fmtTime(user.lastSeen)}</span>
        </div>
      </div>
    </div>
  );
}
