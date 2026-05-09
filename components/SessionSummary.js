"use client";

import { fmtTime, fmtDur } from "@/lib/formatters";
import Modal from "./Modal";

function Stat({ label, value, sub, accent }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl border border-kick-border bg-black/40 p-4">
      <span className="text-[10px] uppercase tracking-wider text-neutral-500">{label}</span>
      <span className={`text-2xl font-bold ${accent ? "text-kick-green" : "text-neutral-100"}`}>{value}</span>
      {sub && <span className="text-xs text-neutral-500">{sub}</span>}
    </div>
  );
}

function Row({ icon, label, right }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-kick-border bg-black/40 px-4 py-3">
      <div className="flex items-center gap-2">
        <span>{icon}</span>
        <span className="text-xs text-neutral-500">{label}</span>
      </div>
      <div className="text-right">{right}</div>
    </div>
  );
}

export default function SessionSummary({ summary, onClose }) {
  if (!summary) return null;

  return (
    <Modal onClose={onClose} maxWidth="max-w-lg">
      <div className="flex flex-col gap-5 p-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-neutral-100">Resumen de sesión</h2>
            <p className="text-xs text-neutral-500">{summary.channel} · finalizó a las {fmtTime(summary.stoppedAt)}</p>
            {summary.streamTitle && <p className="mt-0.5 truncate text-xs italic text-neutral-400">"{summary.streamTitle}"</p>}
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-200">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Main stats */}
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Mensajes totales" value={summary.totalMessages.toLocaleString()} accent />
          <Stat label="Usuarios únicos"  value={summary.uniqueUsers.toLocaleString()} />
          <Stat label="Duración sesión"  value={fmtDur(summary.sessionMs)} />
          <Stat label="Picos detectados" value={summary.peakCount} />
        </div>

        {/* Highlights */}
        <div className="flex flex-col gap-2">
          {summary.topUser && (
            <Row icon="🏆" label="Usuario más activo" right={
              <>
                <div className="font-semibold text-neutral-100">{summary.topUser.username}</div>
                <div className="font-mono text-xs text-neutral-500">{summary.topUser.count} msgs</div>
              </>
            } />
          )}
          {summary.peakMoment && (
            <Row icon="📈" label="Momento más activo" right={
              <>
                <div className="font-mono font-semibold text-kick-green">{summary.peakMoment.count} msgs/min</div>
                <div className="font-mono text-xs text-neutral-500">a las {fmtTime(summary.peakMoment.ts)}</div>
              </>
            } />
          )}
          {summary.topEmote && (
            <Row icon="✨" label="Emote más usado" right={
              <div className="flex items-center gap-2">
                {summary.topEmote.url && <img src={summary.topEmote.url} alt={summary.topEmote.name} className="h-6 w-auto object-contain" />}
                <div>
                  <div className="font-mono text-sm font-semibold text-neutral-100">{summary.topEmote.name}</div>
                  <div className="font-mono text-xs text-neutral-500">{summary.topEmote.count} veces</div>
                </div>
              </div>
            } />
          )}
          {summary.longestCat && (
            <Row icon="🎮" label="Categoría principal" right={
              <>
                <div className="font-semibold text-neutral-100">{summary.longestCat.category}</div>
                <div className="font-mono text-xs text-neutral-500">{fmtDur(summary.longestCat.durationMs)}</div>
              </>
            } />
          )}
          {summary.titleChanges > 0 && (
            <Row icon="✏️" label="Cambios de título" right={
              <div className="font-mono text-sm text-neutral-300">{summary.titleChanges}</div>
            } />
          )}
          {summary.lurkerStats?.viewers > 0 && (
            <div className="rounded-lg border border-kick-border bg-black/40 px-4 py-3">
              <div className="mb-2 flex items-center gap-2">
                <span>👥</span>
                <span className="text-xs text-neutral-500">Engagement de viewers</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { val: `${summary.lurkerStats.engagementRate}%`, label: "engagement", color: "text-kick-green" },
                  { val: summary.lurkerStats.chatters.toLocaleString(), label: "chatters", color: "text-neutral-100" },
                  { val: summary.lurkerStats.lurkers.toLocaleString(), label: "lurkers", color: "text-neutral-500" },
                ].map(({ val, label, color }) => (
                  <div key={label}>
                    <div className={`font-mono text-lg font-bold ${color}`}>{val}</div>
                    <div className="text-[10px] text-neutral-600">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {((summary.subCount ?? 0) + (summary.giftCount ?? 0)) > 0 && (
            <Row icon="⭐" label="Subs durante la sesión" right={
              <div className="flex items-center gap-4">
                {summary.subCount > 0 && <div><div className="font-mono font-semibold text-kick-green">{summary.subCount}</div><div className="text-[10px] text-neutral-600">nuevos</div></div>}
                {summary.giftCount > 0 && <div><div className="font-mono font-semibold text-purple-400">{summary.giftCount}</div><div className="text-[10px] text-neutral-600">gifted</div></div>}
              </div>
            } />
          )}
        </div>

        <button onClick={onClose} className="w-full rounded-xl bg-kick-green py-2.5 text-sm font-semibold text-black transition hover:brightness-110">
          Cerrar
        </button>
      </div>
    </Modal>
  );
}
