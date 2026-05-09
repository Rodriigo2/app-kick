"use client";

function fmt(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function NewViewerStats({ newViewerStats }) {
  if (!newViewerStats) return null;

  const { totalNew, totalEngaged, engagedPct, series } = newViewerStats;
  const oneTimers = totalNew - totalEngaged;
  const maxNew    = Math.max(...series.map((d) => d.newCount), 1);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-kick-border bg-kick-panel p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Nuevos viewers</span>
          <p className="mt-0.5 text-[10px] text-neutral-600">Chatters que aparecieron por primera vez · ventana de 5 min</p>
        </div>
      </div>

      {/* Key numbers */}
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col gap-0.5 rounded-lg border border-kick-border bg-black/30 px-3 py-2">
          <span className="font-mono text-xl font-bold text-neutral-100">{totalNew.toLocaleString()}</span>
          <span className="text-[10px] uppercase tracking-wide text-neutral-600">chatters únicos</span>
        </div>
        <div className="flex flex-col gap-0.5 rounded-lg border border-kick-green/20 bg-kick-green/5 px-3 py-2">
          <span className="font-mono text-xl font-bold text-kick-green">{totalEngaged.toLocaleString()}</span>
          <span className="text-[10px] uppercase tracking-wide text-neutral-600">se engancharon</span>
        </div>
        <div className="flex flex-col gap-0.5 rounded-lg border border-kick-border bg-black/30 px-3 py-2">
          <span className="font-mono text-xl font-bold text-neutral-500">{oneTimers.toLocaleString()}</span>
          <span className="text-[10px] uppercase tracking-wide text-neutral-600">escribieron 1 vez</span>
        </div>
      </div>

      {/* Engagement bar */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-[10px] text-neutral-500">
          <span>Engagement de nuevos</span>
          <span className="font-mono font-semibold" style={{ color: engagedPct >= 50 ? "#53fc18" : engagedPct >= 25 ? "#f59e0b" : "#ef4444" }}>
            {engagedPct}% siguieron escribiendo
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
          <div className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${engagedPct}%`,
              background: engagedPct >= 50 ? "#53fc18" : engagedPct >= 25 ? "#f59e0b" : "#ef4444",
            }} />
        </div>
      </div>

      {/* Timeline bars */}
      {series.length > 1 && (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wide text-neutral-600">Nuevos por franja de 5 min</span>
          <div className="flex items-end gap-1" style={{ height: 48 }}>
            {series.map((d) => {
              const h = Math.max(4, (d.newCount / maxNew) * 44);
              const engPct = d.engagedPct;
              return (
                <div key={d.ts} className="group relative flex flex-1 flex-col items-center justify-end" style={{ height: 48 }}>
                  <div className="w-full overflow-hidden rounded-t" style={{ height: h }}>
                    {/* engaged portion */}
                    <div className="w-full bg-kick-green/60" style={{ height: `${engPct}%` }} />
                    {/* one-time portion */}
                    <div className="w-full bg-neutral-700" style={{ height: `${100 - engPct}%` }} />
                  </div>
                  {/* Tooltip */}
                  <div className="pointer-events-none absolute bottom-full mb-1 hidden rounded bg-black/90 px-2 py-1 text-[9px] text-neutral-200 whitespace-nowrap group-hover:block z-10">
                    {fmt(d.ts)} · {d.newCount} nuevos · {d.engagedPct}% enganchados
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[9px] text-neutral-700">
            <span>{fmt(series[0].ts)}</span>
            <span className="flex items-center gap-2">
              <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-sm bg-kick-green/60" />enganchados</span>
              <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-sm bg-neutral-700" />1 vez</span>
            </span>
            <span>{fmt(series[series.length - 1].ts)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
