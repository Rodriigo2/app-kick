"use client";

function fmtDur(ms) {
  if (!ms || ms < 0) return "—";
  const m = Math.floor(ms / 60_000);
  const h = Math.floor(m / 60);
  return h ? `${h}h ${m % 60}m` : `${m}m`;
}

function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Stable color per category name
const PALETTE = ["#53fc18","#60a5fa","#f97316","#a78bfa","#f43f5e","#fbbf24","#34d399","#fb923c"];
function catColor(name, index) {
  return PALETTE[index % PALETTE.length];
}

export default function CategoryTimeline({ categoryHistory, sessionStart }) {
  if (!categoryHistory || categoryHistory.length === 0) return null;

  const now    = Date.now();
  const start  = sessionStart || categoryHistory[0].startTs;
  const total  = now - start;
  if (total <= 0) return null;

  // Compute duration for each entry
  const entries = categoryHistory.map((c, i) => {
    const endTs = categoryHistory[i + 1]?.startTs ?? now;
    return { ...c, endTs, duration: endTs - c.startTs };
  });

  // Aggregate time per unique category
  const byCategory = {};
  for (const e of entries) {
    byCategory[e.category] = (byCategory[e.category] ?? 0) + e.duration;
  }
  const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  const uniqueCats = sorted.map(([name]) => name);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-kick-border bg-kick-panel p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-100">Tiempo por categoría</h2>
        <span className="text-xs text-neutral-500">
          {uniqueCats.length} categoría{uniqueCats.length !== 1 ? "s" : ""} · {fmtDur(total)} de sesión
        </span>
      </div>

      {/* Timeline bar */}
      <div className="relative flex h-5 w-full overflow-hidden rounded-full">
        {entries.map((e, i) => {
          const idx   = uniqueCats.indexOf(e.category);
          const width = (e.duration / total) * 100;
          return (
            <div
              key={i}
              title={`${e.category} — ${fmtTime(e.startTs)} → ${fmtTime(e.endTs)} (${fmtDur(e.duration)})`}
              className="h-full cursor-help transition-opacity hover:opacity-80"
              style={{ width: `${width}%`, background: catColor(e.category, idx), minWidth: width > 0.5 ? "2px" : "0" }}
            />
          );
        })}
      </div>

      {/* Legend + stats */}
      <div className="flex flex-col gap-1.5">
        {sorted.map(([name, dur], i) => {
          const pct   = ((dur / total) * 100).toFixed(1);
          const color = catColor(name, i);
          const isCurrent = categoryHistory[categoryHistory.length - 1].category === name;
          return (
            <div key={name} className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: color }} />
              <span className="flex-1 truncate text-sm text-neutral-200">{name}</span>
              {isCurrent && (
                <span className="shrink-0 rounded-full bg-kick-green/20 px-1.5 py-0.5 text-[10px] font-semibold text-kick-green">
                  actual
                </span>
              )}
              <span className="shrink-0 font-mono text-xs text-neutral-400">{fmtDur(dur)}</span>
              <span className="shrink-0 w-10 text-right font-mono text-xs text-neutral-600">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
