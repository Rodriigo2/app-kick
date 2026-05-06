"use client";

import { useEffect, useState } from "react";
import { loadSessions, deleteSession } from "@/lib/sessionHistory";

function fmtDate(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
function fmtDuration(start, end) {
  if (!start || !end) return "—";
  const s = Math.floor((end - start) / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
}

function CompareModal({ base, compare, onClose }) {
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  // Build a merged ranking showing position changes
  const baseMap    = new Map(base.users.map((u, i) => [u.username, { ...u, rank: i + 1 }]));
  const compareMap = new Map(compare.users.map((u, i) => [u.username, { ...u, rank: i + 1 }]));
  const allNames   = [...new Set([...baseMap.keys(), ...compareMap.keys()])];

  const rows = allNames.map((name) => {
    const b = baseMap.get(name);
    const c = compareMap.get(name);
    const delta = b && c ? c.rank - b.rank : null;
    return { name, baseRank: b?.rank, baseMsgs: b?.count, compareRank: c?.rank, compareMsgs: c?.count, delta };
  }).sort((a, b) => (a.baseRank ?? 999) - (b.baseRank ?? 999));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex w-full max-w-2xl flex-col rounded-2xl border border-kick-border bg-kick-panel shadow-2xl" style={{ maxHeight: "85vh" }}>
        <div className="flex items-start justify-between border-b border-kick-border px-6 py-4">
          <div>
            <h2 className="font-semibold text-neutral-100">Comparar sesiones</h2>
            <p className="text-xs text-neutral-500">
              {fmtDate(base.startedAt)} vs {fmtDate(compare.startedAt)}
            </p>
            {/* Category comparison quick view */}
            {(base.topCategory || compare.topCategory) && (
              <div className="mt-1 flex gap-4 text-[11px]">
                <span className="text-blue-400">📁 {base.topCategory?.name ?? "—"}</span>
                <span className="text-neutral-500">vs</span>
                <span className="text-kick-green">📁 {compare.topCategory?.name ?? "—"}</span>
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-200">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Header row */}
        <div className="grid grid-cols-[1fr_110px_110px_70px] gap-2 border-b border-kick-border bg-black/40 px-4 py-2 text-[11px] uppercase tracking-wider text-neutral-500">
          <div>Usuario</div>
          <div className="text-right">{base.displayName} ({base.totalMessages} msgs)</div>
          <div className="text-right">{compare.displayName} ({compare.totalMessages} msgs)</div>
          <div className="text-center">Delta</div>
        </div>

        <div className="overflow-y-auto">
          {rows.map((r) => {
            const up   = r.delta !== null && r.delta < 0;
            const down = r.delta !== null && r.delta > 0;
            const isNew = r.baseRank === undefined;
            const gone  = r.compareRank === undefined;
            return (
              <div key={r.name}
                className="grid grid-cols-[1fr_110px_110px_70px] items-center gap-2 border-b border-kick-border/50 px-4 py-2 text-sm last:border-0">
                <div className="truncate font-medium text-neutral-100">{r.name}</div>
                <div className="text-right font-mono text-neutral-400">
                  {r.baseRank ? `#${r.baseRank} · ${r.baseMsgs}` : "—"}
                </div>
                <div className="text-right font-mono text-neutral-400">
                  {r.compareRank ? `#${r.compareRank} · ${r.compareMsgs}` : "—"}
                </div>
                <div className="text-center text-xs font-semibold">
                  {isNew  && <span className="text-kick-green">nuevo</span>}
                  {gone   && <span className="text-neutral-500">ausente</span>}
                  {up     && <span className="text-kick-green">↑{Math.abs(r.delta)}</span>}
                  {down   && <span className="text-red-400">↓{r.delta}</span>}
                  {!isNew && !gone && r.delta === 0 && <span className="text-neutral-600">—</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function SessionHistory() {
  const [sessions, setSessions]   = useState([]);
  const [open, setOpen]           = useState(false);
  const [selected, setSelected]   = useState(null); // id to compare with latest
  const [comparing, setComparing] = useState(null); // { base, compare }

  useEffect(() => {
    if (open) setSessions(loadSessions());
  }, [open]);

  if (sessions.length === 0 && !open) {
    return (
      <button onClick={() => { setSessions(loadSessions()); setOpen(true); }}
        className="rounded-lg border border-kick-border bg-kick-panel px-3 py-1.5 text-xs text-neutral-300 transition hover:border-kick-green/50">
        Historial
      </button>
    );
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="rounded-lg border border-kick-border bg-kick-panel px-3 py-1.5 text-xs text-neutral-300 transition hover:border-kick-green/50">
        Historial ({sessions.length})
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative flex w-full max-w-xl flex-col rounded-2xl border border-kick-border bg-kick-panel shadow-2xl" style={{ maxHeight: "80vh" }}>
            <div className="flex items-center justify-between border-b border-kick-border px-6 py-4">
              <h2 className="font-semibold text-neutral-100">Historial de sesiones</h2>
              <button onClick={() => setOpen(false)} className="text-neutral-500 hover:text-neutral-200">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto p-4 flex flex-col gap-2">
              {sessions.length === 0 && (
                <p className="py-8 text-center text-sm text-neutral-500">
                  No hay sesiones guardadas aún. Detené una sesión para guardarla.
                </p>
              )}
              {sessions.map((s, i) => (
                <div key={s.id}
                  className={`rounded-lg border bg-black/40 p-3 ${selected === s.id ? "border-kick-green/60" : "border-kick-border"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-neutral-100">{s.displayName}</div>
                      <div className="text-xs text-neutral-500">
                        {fmtDate(s.startedAt)} · {fmtDuration(s.startedAt, s.stoppedAt)}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-xs text-neutral-400">
                        <span>{s.totalMessages.toLocaleString()} msgs</span>
                        <span>{s.uniqueUsers} usuarios</span>
                        {s.msgsPerMin > 0 && <span>~{s.msgsPerMin} msgs/min</span>}
                        {s.topCategory && <span>📁 {s.topCategory.name}</span>}
                        {s.peakMoment  && <span>📈 pico {s.peakMoment.count}</span>}
                      </div>
                      {/* Category breakdown if multiple */}
                      {s.categoryHistory?.length > 1 && (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {s.categoryHistory.map((c, ci) => {
                            const mins = Math.round(c.durationMs / 60_000);
                            if (mins < 1) return null;
                            return (
                              <span key={ci}
                                className="rounded bg-white/5 px-2 py-0.5 text-[11px] text-neutral-500">
                                {c.category} <span className="text-neutral-600">{mins}m</span>
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      {i > 0 && (
                        <button
                          onClick={() => { setComparing({ base: s, compare: sessions[0] }); setOpen(false); }}
                          className="rounded border border-kick-border px-2 py-0.5 text-[11px] text-neutral-300 hover:border-kick-green/50">
                          Comparar con última
                        </button>
                      )}
                      <button
                        onClick={() => {
                          deleteSession(s.id);
                          setSessions((prev) => prev.filter((x) => x.id !== s.id));
                        }}
                        className="rounded border border-kick-border px-2 py-0.5 text-[11px] text-neutral-500 hover:border-red-500/50 hover:text-red-400">
                        Eliminar
                      </button>
                    </div>
                  </div>
                  {/* Mini top 3 users */}
                  {s.users.slice(0, 3).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {s.users.slice(0, 3).map((u, ri) => (
                        <span key={u.username}
                          className="rounded bg-white/5 px-2 py-0.5 text-[11px] text-neutral-400">
                          {ri + 1}. {u.username} ({u.count})
                        </span>
                      ))}
                    </div>
                  )}
                  {/* Top emotes */}
                  {s.topEmotes?.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] uppercase tracking-wide text-neutral-600">Emotes:</span>
                      {s.topEmotes.slice(0, 5).map((e) => (
                        <div key={e.name} className="flex items-center gap-1" title={`${e.name} · ${e.count}x`}>
                          {e.url
                            ? <img src={e.url} alt={e.name} className="h-4 w-auto object-contain" loading="lazy" />
                            : <span className="text-[10px] text-neutral-500">{e.name}</span>
                          }
                          <span className="font-mono text-[10px] text-neutral-600">{e.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {comparing && (
        <CompareModal
          base={comparing.base}
          compare={comparing.compare}
          onClose={() => setComparing(null)}
        />
      )}
    </>
  );
}
