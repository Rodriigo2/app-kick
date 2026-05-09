"use client";

function fmt(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const W = 500, H = 80, PAD = { top: 6, right: 6, bottom: 18, left: 6 };

export default function RetentionChart({ retentionData }) {
  if (!retentionData || retentionData.series.length < 2) return null;

  const { totalEver, currentActive, currentDropped, activePct, series } = retentionData;
  const dropPct = 100 - activePct;

  const cW  = W - PAD.left - PAD.right;
  const cH  = H - PAD.top  - PAD.bottom;
  const minTs = series[0].ts;
  const maxTs = series[series.length - 1].ts;
  const span  = maxTs - minTs || 1;

  const xOf = (ts)  => PAD.left + ((ts - minTs) / span) * cW;
  const yOf = (pct) => PAD.top  + cH - (pct / 100) * cH;

  // Active area (green)
  const activeArea = [
    `${xOf(series[0].ts)},${PAD.top + cH}`,
    ...series.map((d) => `${xOf(d.ts)},${yOf(d.activePct)}`),
    `${xOf(series[series.length - 1].ts)},${PAD.top + cH}`,
  ].join(" ");

  const activePoints = series.map((d) => `${xOf(d.ts)},${yOf(d.activePct)}`).join(" ");

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-kick-border bg-kick-panel p-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Viewers que altabearon el stream</span>
          <p className="mt-0.5 text-[10px] text-neutral-600">De todos los que escribieron, cuántos siguen activos · ventana de 5 min</p>
        </div>
        {/* Key numbers */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-center">
            <div className="font-mono text-lg font-bold text-kick-green">{currentActive}</div>
            <div className="text-[10px] text-neutral-500">activos</div>
          </div>
          <div className="h-6 w-px bg-kick-border" />
          <div className="text-center">
            <div className="font-mono text-lg font-bold text-neutral-500">{currentDropped}</div>
            <div className="text-[10px] text-neutral-500">altabearon</div>
          </div>
          <div className="h-6 w-px bg-kick-border" />
          <div className="text-center">
            <div className="font-mono text-2xl font-bold leading-none" style={{ color: dropPct > 70 ? "#ef4444" : dropPct > 40 ? "#f59e0b" : "#53fc18" }}>
              {dropPct}%
            </div>
            <div className="text-[10px] text-neutral-500">altabeo</div>
          </div>
        </div>
      </div>

      {/* Stacked area chart: active (green) + dropped (red) = 100% */}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: "auto", maxHeight: 90 }} preserveAspectRatio="none">
        {/* Dropped area (full background) */}
        <rect x={PAD.left} y={PAD.top} width={cW} height={cH} fill="#ef444418" />

        {/* Active area */}
        <polygon points={activeArea} fill="#53fc1820" />
        <polyline points={activePoints} fill="none" stroke="#53fc18" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {/* Dots with tooltips */}
        {series.map((d) => (
          <circle key={d.ts} cx={xOf(d.ts)} cy={yOf(d.activePct)} r="3" fill="#53fc18">
            <title>{fmt(d.ts)} · {d.active} activos / {d.dropped} dropearon ({d.activePct}% activo)</title>
          </circle>
        ))}

        {/* X labels */}
        <text x={xOf(series[0].ts)} y={H - 2} textAnchor="start" fontSize="8" fill="#6b7280">{fmt(series[0].ts)}</text>
        <text x={xOf(series[series.length - 1].ts)} y={H - 2} textAnchor="end" fontSize="8" fill="#6b7280">{fmt(series[series.length - 1].ts)}</text>
      </svg>

      {/* Footer */}
      <div className="flex items-center justify-between text-[10px] text-neutral-600">
        <span>{totalEver} chatters únicos en total</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-kick-green/40" /> activos</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-red-500/20" /> altabearon</span>
        </div>
      </div>
    </div>
  );
}
