"use client";

import { useMemo, useState } from "react";
import { getUserTopEmote } from "@/lib/chatSession";

const PODIUM_STYLE = [
  { border: "border-yellow-400/50", bg: "bg-yellow-400/8",  num: "text-yellow-400",  label: "1" },
  { border: "border-neutral-400/40", bg: "bg-neutral-400/5", num: "text-neutral-400", label: "2" },
  { border: "border-amber-600/50",   bg: "bg-amber-600/8",   num: "text-amber-500",   label: "3" },
];

function PodiumRow({ u, rank, totalMessages, isTracked, onSelect, onTrack }) {
  const p   = PODIUM_STYLE[rank - 1];
  const pct = totalMessages > 0 ? ((u.count / totalMessages) * 100).toFixed(1) : "0";
  const top = getUserTopEmote(u.username);

  return (
    <div
      onClick={() => onSelect({ user: u, rank })}
      role="button" tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onSelect({ user: u, rank })}
      className={`relative flex cursor-pointer items-center gap-3 rounded-xl border ${p.border} ${p.bg} px-4 py-3 transition hover:brightness-110`}
    >
      {/* Rank */}
      <span className={`shrink-0 w-5 text-center text-lg font-black ${p.num}`}>{p.label}</span>

      {/* Username + badges */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="truncate font-semibold text-neutral-100">{u.username}</span>
        {u.streak >= 2 && (
          <span className="shrink-0 rounded-full bg-orange-500/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-orange-400">
            🔥{u.streak}m
          </span>
        )}
      </div>

      {/* Top emote */}
      {top?.url && (
        <img src={top.url} alt={top.name} title={top.name} className="h-5 w-auto shrink-0 object-contain" />
      )}

      {/* Stats */}
      <div className="shrink-0 text-right">
        <div className="font-mono text-sm font-bold text-neutral-100">{u.count.toLocaleString()}</div>
        <div className={`font-mono text-xs ${p.num}`}>{pct}%</div>
      </div>

      {/* Track */}
      <button
        onClick={(e) => { e.stopPropagation(); onTrack?.(isTracked ? null : u.username); }}
        title={isTracked ? "Dejar de seguir" : "Seguir usuario"}
        className={`shrink-0 text-xs transition ${isTracked ? "text-kick-green" : "text-neutral-700 hover:text-neutral-400"}`}
      >
        {isTracked ? "●" : "○"}
      </button>
    </div>
  );
}

export default function RankingTable({ ranking, totalMessages, emoteMap = {}, trackedUsername, onTrack, onSelect }) {
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(50);

  const setSelected = (val) => onSelect?.(val);

  const filtered = useMemo(() => {
    const q    = query.trim().toLowerCase();
    const list = ranking.filter((u) => u.username?.trim());
    const searched = q ? list.filter((u) => u.username.toLowerCase().includes(q)) : list;
    return searched.slice(0, limit);
  }, [ranking, query, limit]);

  const top    = ranking[0]?.count || 0;
  const podium = filtered.slice(0, 3);
  const rest   = filtered.slice(3);

  return (
    <>
      <div className="flex flex-col gap-3 rounded-xl border border-kick-border bg-kick-panel p-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-neutral-100">Ranking de viewers</h2>
            <p className="text-[10px] text-neutral-500">Clic para ver detalle · actualización cada segundo</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar usuario…"
              className="w-36 rounded-lg border border-kick-border bg-black/40 px-2.5 py-1.5 text-xs text-neutral-100 placeholder:text-neutral-600 focus:border-kick-green/60 focus:outline-none"
            />
            <select
              value={limit} onChange={(e) => setLimit(Number(e.target.value))}
              className="rounded-lg border border-kick-border bg-black/40 px-2 py-1.5 text-xs text-neutral-100 focus:border-kick-green/60 focus:outline-none"
            >
              <option value={25}>Top 25</option>
              <option value={50}>Top 50</option>
              <option value={100}>Top 100</option>
              <option value={500}>Top 500</option>
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-8 text-center text-sm text-neutral-500">Aún no hay mensajes registrados.</div>
        ) : (
          <>
            {/* Podium — compact rows */}
            {podium.length > 0 && (
              <div className="flex flex-col gap-1.5">
                {podium.map((u, i) => (
                  <PodiumRow key={u.username} u={u} rank={i + 1}
                    totalMessages={totalMessages}
                    isTracked={trackedUsername === u.username}
                    onSelect={setSelected} onTrack={onTrack}
                  />
                ))}
              </div>
            )}

            {/* Rest — compact list */}
            {rest.length > 0 && (
              <div className="overflow-hidden rounded-lg border border-kick-border">
                <div className="grid grid-cols-[40px_1fr_80px_72px_28px] gap-2 border-b border-kick-border bg-black/40 px-3 py-1.5 text-[10px] uppercase tracking-wider text-neutral-600">
                  <div>#</div><div>Usuario</div>
                  <div className="text-right">Msgs</div>
                  <div className="text-right">%</div>
                  <div />
                </div>
                <div className="overflow-y-auto" style={{ maxHeight: rest.length > 15 ? "38vh" : undefined }}>
                  {rest.map((u, idx) => {
                    const rank      = idx + 4;
                    const pct       = totalMessages > 0 ? (u.count / totalMessages) * 100 : 0;
                    const barPct    = top > 0 ? (u.count / top) * 100 : 0;
                    const isTracked = trackedUsername === u.username;
                    return (
                      <div key={u.username}
                        className={`relative grid w-full grid-cols-[40px_1fr_80px_72px_28px] items-center gap-2 border-b border-kick-border/40 px-3 py-1.5 text-xs last:border-b-0 ${isTracked ? "bg-kick-green/5" : "hover:bg-white/5"}`}
                      >
                        <div className="pointer-events-none absolute inset-y-0 left-0 bg-kick-green/8" style={{ width: `${barPct}%` }} />
                        <button onClick={() => setSelected({ user: u, rank })} className="relative font-mono text-neutral-600 text-left">{rank}</button>
                        <button onClick={() => setSelected({ user: u, rank })} className="relative flex min-w-0 items-center gap-1.5 text-left">
                          <span className="truncate font-medium text-neutral-200">{u.username}</span>
                          {u.streak >= 2 && (
                            <span className="shrink-0 rounded-full bg-orange-500/20 px-1 font-mono text-[8px] font-bold text-orange-400">🔥{u.streak}</span>
                          )}
                        </button>
                        <div className="relative text-right font-mono text-neutral-300">{u.count.toLocaleString()}</div>
                        <div className="relative text-right font-mono text-neutral-500">{pct.toFixed(1)}%</div>
                        <button onClick={() => onTrack?.(isTracked ? null : u.username)}
                          className={`relative flex items-center justify-center transition ${isTracked ? "text-kick-green" : "text-neutral-700 hover:text-neutral-400"}`}>
                          {isTracked ? "●" : "○"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

    </>
  );
}
