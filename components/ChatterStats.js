"use client";

import { fmtTime } from "@/lib/formatters";

// Merged: NewViewerStats + RetentionChart
function getCategoryAt(ts, categoryHistory = []) {
  if (!categoryHistory.length) return null;
  let cat = categoryHistory[0]?.category ?? null;
  for (const c of categoryHistory) {
    if (c.startTs <= ts) cat = c.category;
    else break;
  }
  return cat;
}

export default function ChatterStats({ newViewerStats, retentionData, categoryHistory = [] }) {
  if (!newViewerStats && !retentionData) return null;

  const both = newViewerStats && retentionData;

  if (both) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <NewViewers data={newViewerStats} />
        <Dropoff    data={retentionData}  />
      </div>
    );
  }

  return newViewerStats
    ? <NewViewers data={newViewerStats} />
    : <Dropoff    data={retentionData} categoryHistory={categoryHistory} />;
}

function NewViewers({ data }) {
  const { totalNew, totalEngaged, engagedPct, series } = data;
  const oneTimers = totalNew - totalEngaged;
  const maxNew    = Math.max(...series.map((d) => d.newCount), 1);
  const color     = engagedPct >= 50 ? "#53fc18" : engagedPct >= 25 ? "#f59e0b" : "#ef4444";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-kick-border bg-kick-panel p-4">
      <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Participación del chat</span>

      <div className="grid grid-cols-2 gap-2">
        <Pill label="siguieron chateando" value={totalEngaged} color="text-kick-green" highlight />
        <Pill label="escribieron 1 vez"   value={oneTimers}   color="text-neutral-500" />
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-[10px] text-neutral-500">
          <span>Siguieron chateando</span>
          <span className="font-mono font-semibold" style={{ color }}>{engagedPct}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${engagedPct}%`, background: color }} />
        </div>

      </div>

      {series.length > 1 && (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-neutral-600">Chatters por franja de 5 min</span>
          <div className="flex items-end gap-0.5" style={{ height: 40 }}>
            {series.map((d) => {
              const h = Math.max(3, (d.newCount / maxNew) * 38);
              return (
                <div key={d.ts} className="group relative flex flex-1 flex-col items-center justify-end" style={{ height: 40 }}>
                  <div className="w-full overflow-hidden rounded-t" style={{ height: h }}>
                    <div style={{ height: `${d.engagedPct}%`, background: "#53fc1880" }} />
                    <div style={{ height: `${100 - d.engagedPct}%`, background: "#374151" }} />
                  </div>
                  <div className="pointer-events-none absolute bottom-full mb-1 hidden rounded bg-black/90 px-1.5 py-0.5 text-[9px] text-neutral-200 whitespace-nowrap group-hover:block z-10">
                    {fmtTime(d.ts)} · {d.newCount} chatters · {d.engagedPct}% siguieron chateando
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Dropoff({ data, categoryHistory = [] }) {
  const { totalEver, currentActive, currentDropped, activePct, series } = data;
  const dropPct = 100 - activePct;
  const color   = dropPct > 70 ? "#ef4444" : dropPct > 40 ? "#f59e0b" : "#53fc18";

  const W = 800, H = 120, PAD = { t: 8, r: 8, b: 22, l: 8 };
  const cW = W - PAD.l - PAD.r, cH = H - PAD.t - PAD.b;
  const minTs = series[0]?.ts ?? 0, span = (series[series.length - 1]?.ts ?? 1) - minTs || 1;
  const xOf = (ts)  => PAD.l + ((ts - minTs) / span) * cW;
  const yOf = (pct) => PAD.t + cH - (pct / 100) * cH;

  // Peak is always the first point (series starts at peak)
  const peakActive  = series[0];
  const peakDropoff = series.slice(1).reduce((a, b) => b.activePct < a.activePct ? b : a, series[1] ?? series[0]);

  const activeArea = [
    `${xOf(series[0].ts)},${PAD.t + cH}`,
    ...series.map((d) => `${xOf(d.ts)},${yOf(d.activePct)}`),
    `${xOf(series[series.length - 1].ts)},${PAD.t + cH}`,
  ].join(" ");

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-kick-border bg-kick-panel p-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Viewers que altabearon el stream</span>
          <p className="text-[10px] text-neutral-600 mt-0.5">
            Desde el pico de actividad ({data.peakCount} chatters) · ventana de 10 min
          </p>
        </div>
        <span className="text-[10px] text-neutral-600">{data.peakCount} en el pico</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Pill label="del pico siguen" value={currentActive}  color="text-kick-green" highlight />
        <Pill label="altabearon"      value={currentDropped} color="text-neutral-500" />
        <div className="flex flex-col gap-1 rounded-lg border border-kick-border bg-black/30 px-4 py-3">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold leading-none" style={{ color }}>{dropPct}%</span>
            {data.trend != null && Math.abs(data.trend) >= 2 && (
              <span className={`text-sm font-bold ${data.trend > 0 ? "text-kick-green" : "text-red-400"}`}>
                {data.trend > 0 ? `↑ +${data.trend}%` : `↓ ${data.trend}%`}
              </span>
            )}
          </div>
          <span className="text-[10px] uppercase tracking-wide text-neutral-600">tasa de altabeo</span>
        </div>
      </div>

      {series.length >= 2 && (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: "auto", maxHeight: 130 }} preserveAspectRatio="none">
          <rect x={PAD.l} y={PAD.t} width={cW} height={cH} fill="#ef444410" />
          <polygon points={activeArea} fill="#53fc1815" />
          <polyline points={series.map((d) => `${xOf(d.ts)},${yOf(d.activePct)}`).join(" ")}
            fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          {series.map((d) => (
            <circle key={d.ts} cx={xOf(d.ts)} cy={yOf(d.activePct)} r="3" fill={color} opacity="0.7">
              <title>{fmtTime(d.ts)} · {d.active} activos / {d.dropped} altabearon ({d.activePct}%)</title>
            </circle>
          ))}

          {/* 🟢 Peak activity marker */}
          {peakActive && peakActive !== series[series.length - 1] && (() => {
            const cat = getCategoryAt(peakActive.ts, categoryHistory);
            const x   = xOf(peakActive.ts);
            const anchor = x > W * 0.7 ? "end" : "start";
            const dx = anchor === "end" ? -4 : 4;
            return (
              <g>
                <line x1={x} y1={PAD.t} x2={x} y2={PAD.t + cH}
                  stroke="#53fc18" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.8" />
                <circle cx={x} cy={yOf(peakActive.activePct)} r="5" fill="#53fc18" />
                <text x={x + dx} y={PAD.t + 10} fontSize="8" fill="#53fc18" textAnchor={anchor}>
                  🟢 {peakActive.activePct}% activos · {fmtTime(peakActive.ts)}
                </text>
                {cat && (
                  <text x={x + dx} y={PAD.t + 20} fontSize="7" fill="#53fc1899" textAnchor={anchor}>
                    {cat}
                  </text>
                )}
              </g>
            );
          })()}

          {/* 🔴 Peak dropoff marker */}
          {peakDropoff && peakDropoff.ts !== peakActive?.ts && (() => {
            const cat = getCategoryAt(peakDropoff.ts, categoryHistory);
            const x   = xOf(peakDropoff.ts);
            const anchor = x > W * 0.7 ? "end" : "start";
            const dx = anchor === "end" ? -4 : 4;
            return (
              <g>
                <line x1={x} y1={PAD.t} x2={x} y2={PAD.t + cH}
                  stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.8" />
                <circle cx={x} cy={yOf(peakDropoff.activePct)} r="5" fill="#ef4444" />
                <text x={x + dx} y={PAD.t + 10} fontSize="8" fill="#ef4444" textAnchor={anchor}>
                  🔴 {100 - peakDropoff.activePct}% altabeo · {fmtTime(peakDropoff.ts)}
                </text>
                {cat && (
                  <text x={x + dx} y={PAD.t + 20} fontSize="7" fill="#ef444499" textAnchor={anchor}>
                    {cat}
                  </text>
                )}
              </g>
            );
          })()}

          <text x={xOf(series[0].ts)} y={H - 2} fontSize="9" fill="#4b5563">{fmtTime(series[0].ts)}</text>
          <text x={xOf(series[series.length - 1].ts)} y={H - 2} textAnchor="end" fontSize="9" fill="#4b5563">{fmtTime(series[series.length - 1].ts)}</text>
        </svg>
      )}
    </div>
  );
}

function Pill({ label, value, color, highlight }) {
  return (
    <div className={`flex flex-col gap-1 rounded-lg border px-4 py-3 ${highlight ? "border-kick-green/20 bg-kick-green/5" : "border-kick-border bg-black/30"}`}>
      <span className={`font-mono text-3xl font-bold leading-none ${color}`}>{value?.toLocaleString()}</span>
      <span className="text-[10px] uppercase tracking-wide text-neutral-600">{label}</span>
    </div>
  );
}
