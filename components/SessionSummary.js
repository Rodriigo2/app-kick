"use client";

import { useEffect } from "react";

function fmtDur(ms) {
  if (!ms) return "—";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h ? `${h}h ${m}m ${sec}s` : m ? `${m}m ${sec}s` : `${sec}s`;
}
function fmtTime(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function Stat({ label, value, sub, accent }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl border border-kick-border bg-black/40 p-4">
      <span className="text-[10px] uppercase tracking-wider text-neutral-500">{label}</span>
      <span className={`text-2xl font-bold ${accent ? "text-kick-green" : "text-neutral-100"}`}>{value}</span>
      {sub && <span className="text-xs text-neutral-500">{sub}</span>}
    </div>
  );
}

export default function SessionSummary({ summary, onClose }) {
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  if (!summary) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative flex w-full max-w-lg flex-col gap-5 rounded-2xl border border-kick-border bg-kick-panel p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-neutral-100">Resumen de sesión</h2>
            <p className="text-xs text-neutral-500">
              {summary.channel} · finalizó a las {fmtTime(summary.stoppedAt)}
            </p>
            {summary.streamTitle && (
              <p className="mt-0.5 truncate text-xs text-neutral-400 italic">"{summary.streamTitle}"</p>
            )}
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-200">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Main stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Mensajes totales" value={summary.totalMessages.toLocaleString()} accent />
          <Stat label="Usuarios únicos"  value={summary.uniqueUsers.toLocaleString()} />
          <Stat label="Duración sesión"  value={fmtDur(summary.sessionMs)} />
          <Stat label="Picos detectados" value={summary.peakCount} />
        </div>

        {/* Highlights */}
        <div className="flex flex-col gap-2">
          {summary.topUser && (
            <div className="flex items-center justify-between rounded-lg border border-kick-border bg-black/40 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-yellow-400">🏆</span>
                <span className="text-xs text-neutral-500">Usuario más activo</span>
              </div>
              <div className="text-right">
                <div className="font-semibold text-neutral-100">{summary.topUser.username}</div>
                <div className="font-mono text-xs text-neutral-500">{summary.topUser.count} msgs</div>
              </div>
            </div>
          )}

          {summary.peakMoment && (
            <div className="flex items-center justify-between rounded-lg border border-kick-border bg-black/40 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-orange-400">📈</span>
                <span className="text-xs text-neutral-500">Momento más activo</span>
              </div>
              <div className="text-right">
                <div className="font-mono font-semibold text-kick-green">{summary.peakMoment.count} msgs/min</div>
                <div className="font-mono text-xs text-neutral-500">a las {fmtTime(summary.peakMoment.ts)}</div>
              </div>
            </div>
          )}

          {summary.topEmote && (
            <div className="flex items-center justify-between rounded-lg border border-kick-border bg-black/40 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-purple-400">✨</span>
                <span className="text-xs text-neutral-500">Emote más usado</span>
              </div>
              <div className="flex items-center gap-2">
                {summary.topEmote.url && (
                  <img src={summary.topEmote.url} alt={summary.topEmote.name} className="h-6 w-auto object-contain" />
                )}
                <div className="text-right">
                  <div className="font-mono text-sm font-semibold text-neutral-100">{summary.topEmote.name}</div>
                  <div className="font-mono text-xs text-neutral-500">{summary.topEmote.count} veces</div>
                </div>
              </div>
            </div>
          )}

          {summary.longestCat && (
            <div className="flex items-center justify-between rounded-lg border border-kick-border bg-black/40 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-blue-400">🎮</span>
                <span className="text-xs text-neutral-500">Categoría principal</span>
              </div>
              <div className="text-right">
                <div className="font-semibold text-neutral-100">{summary.longestCat.category}</div>
                <div className="font-mono text-xs text-neutral-500">{fmtDur(summary.longestCat.durationMs)}</div>
              </div>
            </div>
          )}

          {summary.titleChanges > 0 && (
            <div className="flex items-center justify-between rounded-lg border border-kick-border bg-black/40 px-4 py-3">
              <div className="flex items-center gap-2">
                <span>✏️</span>
                <span className="text-xs text-neutral-500">Cambios de título</span>
              </div>
              <div className="font-mono text-sm text-neutral-300">{summary.titleChanges}</div>
            </div>
          )}
        </div>

        <button onClick={onClose}
          className="w-full rounded-xl bg-kick-green py-2.5 text-sm font-semibold text-black transition hover:brightness-110">
          Cerrar
        </button>
      </div>
    </div>
  );
}
