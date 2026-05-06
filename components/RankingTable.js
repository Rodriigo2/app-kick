"use client";

import { useMemo, useState } from "react";
import UserModal from "./UserModal";
import { getUserTopEmote } from "@/lib/chatSession";

// Gold / Silver / Bronze palette
const PODIUM = [
  { border: "border-yellow-400/60", bg: "bg-yellow-400/10", text: "text-yellow-400", label: "1", shadow: "shadow-yellow-400/10" },
  { border: "border-neutral-400/60", bg: "bg-neutral-400/10", text: "text-neutral-300", label: "2", shadow: "shadow-neutral-400/10" },
  { border: "border-amber-600/60",   bg: "bg-amber-600/10",   text: "text-amber-500",   label: "3", shadow: "shadow-amber-600/10"  },
];

function PodiumCard({ u, rank, totalMessages, isTracked, onSelect, onTrack }) {
  const p   = PODIUM[rank - 1];
  const pct = totalMessages > 0 ? ((u.count / totalMessages) * 100).toFixed(1) : "0";
  const top = getUserTopEmote(u.username);

  return (
    <button
      onClick={() => onSelect({ user: u, rank })}
      className={`relative flex flex-col gap-2 rounded-xl border ${p.border} ${p.bg} p-4 text-left shadow-lg ${p.shadow} transition hover:brightness-110 focus:outline-none ${isTracked ? "ring-1 ring-kick-green/50" : ""}`}
    >
      {/* Rank badge */}
      <div className={`text-3xl font-black ${p.text}`}>{p.label}</div>

      {/* Username + streak */}
      <div className="flex items-center gap-2">
        <span className="truncate font-semibold text-neutral-100 text-base">{u.username}</span>
        {u.streak >= 2 && (
          <span title={`${u.streak} minutos consecutivos activo`}
            className="shrink-0 rounded-full bg-orange-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-orange-400">
            🔥{u.streak}m
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="font-mono text-2xl font-bold text-neutral-100">{u.count.toLocaleString()}</div>
          <div className="text-[10px] uppercase tracking-wide text-neutral-500">mensajes</div>
        </div>
        <div className="text-right">
          <div className={`font-mono text-lg font-semibold ${p.text}`}>{pct}%</div>
          <div className="text-[10px] uppercase tracking-wide text-neutral-500">del chat</div>
        </div>
      </div>

      {/* Top emote */}
      {top?.url && (
        <div className="flex items-center gap-1.5 border-t border-white/5 pt-2">
          <img src={top.url} alt={top.name} className="h-5 w-auto object-contain" />
          <span className="truncate text-xs text-neutral-400">{top.name}</span>
          <span className="ml-auto shrink-0 font-mono text-[10px] text-neutral-600">×{top.count}</span>
        </div>
      )}

      {/* Track button */}
      <button
        onClick={(e) => { e.stopPropagation(); onTrack?.(isTracked ? null : u.username); }}
        title={isTracked ? "Dejar de seguir" : "Seguir usuario"}
        className={`absolute right-3 top-3 text-sm transition ${isTracked ? "text-kick-green" : "text-neutral-600 hover:text-neutral-300"}`}
      >
        {isTracked ? "●" : "○"}
      </button>
    </button>
  );
}

export default function RankingTable({ ranking, totalMessages, emoteMap = {}, trackedUsername, onTrack }) {
  const [query, setQuery]       = useState("");
  const [limit, setLimit]       = useState(50);
  const [selected, setSelected] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? ranking.filter((u) => u.username.toLowerCase().includes(q))
      : ranking;
    return list.slice(0, limit);
  }, [ranking, query, limit]);

  const top     = ranking[0]?.count || 0;
  const podium  = filtered.slice(0, 3);
  const rest    = filtered.slice(3);

  return (
    <>
      <div className="flex flex-col gap-4 rounded-xl border border-kick-border bg-kick-panel p-4">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-neutral-100">Ranking de viewers</h2>
            <p className="text-xs text-neutral-500">Clic para ver detalle · actualización cada segundo</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar usuario…"
              className="w-44 rounded-lg border border-kick-border bg-black/40 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-kick-green/60 focus:outline-none"
            />
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="rounded-lg border border-kick-border bg-black/40 px-2 py-2 text-sm text-neutral-100 focus:border-kick-green/60 focus:outline-none"
            >
              <option value={25}>Top 25</option>
              <option value={50}>Top 50</option>
              <option value={100}>Top 100</option>
              <option value={500}>Top 500</option>
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-10 text-center text-sm text-neutral-500">
            Aún no hay mensajes registrados.
          </div>
        ) : (
          <>
            {/* Podium — top 3 */}
            {podium.length > 0 && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {podium.map((u, i) => (
                  <PodiumCard
                    key={u.username}
                    u={u}
                    rank={i + 1}
                    totalMessages={totalMessages}
                    isTracked={trackedUsername === u.username}
                    onSelect={setSelected}
                    onTrack={onTrack}
                  />
                ))}
              </div>
            )}

            {/* Rest — compact list */}
            {rest.length > 0 && (
              <div className="overflow-hidden rounded-lg border border-kick-border">
                <div className="grid grid-cols-[52px_1fr_100px_90px_36px] gap-2 border-b border-kick-border bg-black/40 px-3 py-2 text-[11px] uppercase tracking-wider text-neutral-500">
                  <div>#</div>
                  <div>Usuario</div>
                  <div className="text-right">Mensajes</div>
                  <div className="text-right">% total</div>
                  <div />
                </div>

                <div className="max-h-[40vh] overflow-y-auto">
                  {rest.map((u, idx) => {
                    const rank      = idx + 4;
                    const pct       = totalMessages > 0 ? (u.count / totalMessages) * 100 : 0;
                    const barPct    = top > 0 ? (u.count / top) * 100 : 0;
                    const isTracked = trackedUsername === u.username;

                    return (
                      <div
                        key={u.username}
                        className={`relative grid w-full grid-cols-[52px_1fr_100px_90px_36px] items-center gap-2 border-b border-kick-border/60 px-3 py-2 text-sm last:border-b-0 ${isTracked ? "bg-kick-green/5" : "hover:bg-white/5"}`}
                      >
                        <div className="pointer-events-none absolute inset-y-0 left-0 bg-kick-green/10" style={{ width: `${barPct}%` }} />
                        <button onClick={() => setSelected({ user: u, rank })} className="relative font-mono text-neutral-500 text-left focus:outline-none">{rank}</button>
                        <button onClick={() => setSelected({ user: u, rank })} className="relative flex min-w-0 items-center gap-1.5 text-left focus:outline-none">
                          <span className="truncate font-medium text-neutral-100">{u.username}</span>
                          {u.streak >= 2 && (
                            <span title={`${u.streak} min consecutivos`}
                              className="shrink-0 rounded-full bg-orange-500/20 px-1 font-mono text-[9px] font-bold text-orange-400">
                              🔥{u.streak}
                            </span>
                          )}
                        </button>
                        <div className="relative text-right font-mono text-neutral-100">{u.count.toLocaleString()}</div>
                        <div className="relative text-right font-mono text-neutral-400">{pct.toFixed(1)}%</div>
                        <button
                          onClick={() => onTrack?.(isTracked ? null : u.username)}
                          title={isTracked ? "Dejar de seguir" : "Seguir usuario"}
                          className={`relative flex items-center justify-center text-xs transition ${isTracked ? "text-kick-green" : "text-neutral-600 hover:text-neutral-300"}`}
                        >
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

      {selected && (
        <UserModal
          user={selected.user}
          rank={selected.rank}
          totalMessages={totalMessages}
          emoteMap={emoteMap}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
