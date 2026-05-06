"use client";

import { useEffect, useState } from "react";

function EmoteModal({ emoteRanking, totalMessages, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const top = emoteRanking[0]?.count || 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative flex w-full max-w-2xl flex-col rounded-2xl border border-kick-border bg-kick-panel shadow-2xl" style={{ maxHeight: "80vh" }}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-kick-border px-6 py-4">
          <div>
            <h2 className="font-semibold text-neutral-100">Top emotes</h2>
            <p className="text-xs text-neutral-500">{emoteRanking.length} emotes usados · {totalMessages.toLocaleString()} mensajes totales</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-neutral-500 hover:bg-white/5 hover:text-neutral-200">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto">
          <div className="grid grid-cols-[32px_44px_1fr_80px_80px] gap-2 border-b border-kick-border bg-black/40 px-4 py-2 text-[11px] uppercase tracking-wider text-neutral-500">
            <div>#</div>
            <div />
            <div>Emote</div>
            <div className="text-right">Usos</div>
            <div className="text-right">% total</div>
          </div>

          {emoteRanking.map((e, i) => {
            const pct    = totalMessages > 0 ? ((e.count / totalMessages) * 100).toFixed(2) : "0.00";
            const barPct = (e.count / top) * 100;

            return (
              <div key={e.name} className="relative grid grid-cols-[32px_44px_1fr_80px_80px] items-center gap-2 border-b border-kick-border/60 px-4 py-2 text-sm last:border-b-0 hover:bg-white/5">
                <div
                  className="pointer-events-none absolute inset-y-0 left-0 bg-kick-green/10"
                  style={{ width: `${barPct}%` }}
                />
                <div className="relative font-mono text-neutral-500">{i + 1}</div>
                <div className="relative flex justify-center">
                  {e.url ? (
                    <img src={e.url} alt={e.name} className="h-7 w-auto object-contain" loading="lazy" />
                  ) : (
                    <span className="text-neutral-500">?</span>
                  )}
                </div>
                <div className="relative truncate font-medium text-neutral-100" title={e.name}>{e.name}</div>
                <div className="relative text-right font-mono text-neutral-100">{e.count.toLocaleString()}</div>
                <div className="relative text-right font-mono text-neutral-400">{pct}%</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function EmoteRanking({ emoteRanking, totalMessages }) {
  const [showModal, setShowModal] = useState(false);

  if (!emoteRanking || emoteRanking.length === 0) return null;

  const top5 = emoteRanking.slice(0, 5);
  const top  = top5[0]?.count || 1;

  return (
    <>
      <div className="flex flex-col gap-3 rounded-xl border border-kick-border bg-kick-panel p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-100">Top emotes</h2>
          <button
            onClick={() => setShowModal(true)}
            className="rounded-lg border border-kick-border bg-black/40 px-3 py-1 text-xs text-neutral-300 transition hover:border-kick-green/50 hover:text-kick-green"
          >
            Ver lista ({emoteRanking.length})
          </button>
        </div>

        <div className="flex gap-3">
          {top5.map((e, i) => {
            const pct    = totalMessages > 0 ? ((e.count / totalMessages) * 100).toFixed(1) : "0";
            const barPct = (e.count / top) * 100;

            return (
              <div
                key={e.name}
                className="relative flex flex-1 flex-col items-center gap-1.5 overflow-hidden rounded-lg border border-kick-border bg-black/40 px-2 py-3 text-center"
              >
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-kick-green/10" style={{ height: `${barPct}%` }} />
                <span className="absolute left-1.5 top-1.5 font-mono text-[10px] text-neutral-600">#{i + 1}</span>
                {e.url ? (
                  <img src={e.url} alt={e.name} title={e.name} className="relative h-9 w-auto object-contain" loading="lazy" />
                ) : (
                  <span className="relative text-xl">?</span>
                )}
                <span className="relative w-full truncate text-[11px] font-medium text-neutral-200" title={e.name}>{e.name}</span>
                <div className="relative flex items-baseline gap-1">
                  <span className="font-mono text-sm font-semibold text-neutral-100">{e.count.toLocaleString()}</span>
                  <span className="text-[10px] text-neutral-500">{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showModal && (
        <EmoteModal
          emoteRanking={emoteRanking}
          totalMessages={totalMessages}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
