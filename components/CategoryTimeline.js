"use client";

import { fmtTime, fmtDur } from "@/lib/formatters";

const PALETTE = ["#53fc18","#60a5fa","#f97316","#a78bfa","#f43f5e","#fbbf24","#34d399","#fb923c"];
function catColor(name, allNames) {
  return PALETTE[allNames.indexOf(name) % PALETTE.length];
}

export default function CategoryTimeline({ categoryHistory, categoryStats = [], sessionStart }) {
  if (!categoryHistory || categoryHistory.length === 0) return null;

  const now        = Date.now();
  const start      = sessionStart || categoryHistory[0].startTs;
  const total      = now - start;
  if (total <= 0) return null;

  const entries = categoryHistory.map((c, i) => {
    const endTs   = categoryHistory[i + 1]?.startTs ?? now;
    return { ...c, endTs, duration: endTs - c.startTs };
  });

  const allNames = [...new Set(entries.map((e) => e.category))];

  // Top stats by messages (from categoryStats if available, else by duration)
  const topByMsgs    = categoryStats.length > 0
    ? categoryStats[0]
    : null;
  const topByUsers   = categoryStats.length > 0
    ? [...categoryStats].sort((a, b) => b.avgUsersPerMin - a.avgUsersPerMin)[0]
    : null;
  const maxMsgs      = categoryStats[0]?.totalMessages || 1;

  const isCurrent    = (cat) => categoryHistory[categoryHistory.length - 1].category === cat;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-kick-border bg-kick-panel p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-100">Tiempo por categoría</h2>
        <span className="text-xs text-neutral-500">
          {allNames.length} categoría{allNames.length !== 1 ? "s" : ""} · {fmtDur(total)}
        </span>
      </div>

      {/* Timeline bar */}
      <div className="relative flex h-5 w-full overflow-hidden rounded-full">
        {entries.map((e, i) => (
          <div
            key={i}
            title={`${e.category} — ${fmtTime(e.startTs)} → ${fmtTime(e.endTs)} (${fmtDur(e.duration)})`}
            className="h-full cursor-help transition-opacity hover:opacity-80"
            style={{
              width:      `${(e.duration / total) * 100}%`,
              background: catColor(e.category, allNames),
              minWidth:   (e.duration / total) > 0.005 ? "2px" : "0",
            }}
          />
        ))}
      </div>

      {/* Stats table */}
      {categoryStats.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_80px_90px_90px] gap-2 px-1 text-[10px] uppercase tracking-wider text-neutral-600">
            <div>Categoría</div>
            <div className="text-right">Tiempo</div>
            <div className="text-right">Msgs/min</div>
            <div className="text-right">Usuarios/min</div>
          </div>

          {categoryStats.map((s) => {
            const durMs   = entries.filter((e) => e.category === s.category).reduce((acc, e) => acc + e.duration, 0);
            const barPct  = (s.totalMessages / maxMsgs) * 100;
            const color   = catColor(s.category, allNames);
            const current = isCurrent(s.category);
            const isBest  = s.category === topByMsgs?.category;

            return (
              <div key={s.category} className="flex flex-col gap-1">
                {/* Stats row */}
                <div className="relative grid grid-cols-[1fr_80px_90px_90px] items-center gap-2 overflow-hidden rounded-lg border border-kick-border/60 px-3 py-2 hover:bg-white/5">
                  <div className="pointer-events-none absolute inset-y-0 left-0 opacity-10 transition-all"
                    style={{ width: `${barPct}%`, background: color }} />
                  <div className="relative flex items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: color }} />
                    <span className="truncate text-sm font-medium text-neutral-100">{s.category}</span>
                    {current && <span className="shrink-0 rounded-full bg-kick-green/20 px-1.5 py-0.5 text-[10px] font-semibold text-kick-green">actual</span>}
                    {isBest && !current && <span className="shrink-0 text-[10px]" title="Más activo">🏆</span>}
                  </div>
                  <div className="relative text-right font-mono text-xs text-neutral-400">{fmtDur(durMs)}</div>
                  <div className={`relative text-right font-mono text-xs font-semibold ${isBest ? "text-kick-green" : "text-neutral-300"}`}>
                    {s.avgMsgsPerMin}<span className="text-neutral-500 font-normal">/min</span>
                  </div>
                  <div className={`relative text-right font-mono text-xs ${s.category === topByUsers?.category ? "text-blue-400 font-semibold" : "text-neutral-400"}`}>
                    {s.avgUsersPerMin}<span className="text-neutral-600 font-normal"> usr</span>
                  </div>
                </div>

                {/* Top 5 users in this category */}
                {s.topUsers?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 px-1 pb-1">
                    {s.topUsers.map((u, ui) => (
                      <span key={u.username}
                        className="flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-neutral-400">
                        <span className={ui === 0 ? "text-yellow-400" : ui === 1 ? "text-neutral-300" : ui === 2 ? "text-amber-600" : "text-neutral-600"}>
                          {ui + 1}.
                        </span>
                        <span className="truncate max-w-[80px]">{u.username}</span>
                        <span className="font-mono text-neutral-600">{u.count}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Winner callout */}
          {topByMsgs && (
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 border-t border-kick-border pt-2 text-xs text-neutral-500">
              <span>
                🏆 Más activo: <span className="font-semibold" style={{ color: catColor(topByMsgs.category, allNames) }}>{topByMsgs.category}</span>
                <span className="ml-1 text-neutral-600">({topByMsgs.avgMsgsPerMin} msgs/min · {topByMsgs.totalMessages.toLocaleString()} msgs)</span>
              </span>
              {topByUsers && topByUsers.category !== topByMsgs.category && (
                <span>
                  👥 Más viewers: <span className="font-semibold text-blue-400">{topByUsers.category}</span>
                  <span className="ml-1 text-neutral-600">({topByUsers.avgUsersPerMin} usuarios/min)</span>
                </span>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Simple list if no stats yet */
        <div className="flex flex-col gap-1.5">
          {[...new Set(entries.map((e) => e.category))].map((cat) => {
            const durMs   = entries.filter((e) => e.category === cat).reduce((acc, e) => acc + e.duration, 0);
            const pct     = ((durMs / total) * 100).toFixed(1);
            return (
              <div key={cat} className="flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: catColor(cat, allNames) }} />
                <span className="flex-1 truncate text-sm text-neutral-200">{cat}</span>
                {isCurrent(cat) && <span className="rounded-full bg-kick-green/20 px-1.5 py-0.5 text-[10px] font-semibold text-kick-green">actual</span>}
                <span className="font-mono text-xs text-neutral-400">{fmtDur(durMs)}</span>
                <span className="w-10 text-right font-mono text-xs text-neutral-600">{pct}%</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
