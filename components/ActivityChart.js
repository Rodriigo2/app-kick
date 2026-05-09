"use client";

import { useState } from "react";

// ── Shared helpers ────────────────────────────────────────────────────────────
function fmt(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function fmtLong(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// ── Line chart ────────────────────────────────────────────────────────────────
const LW = 600, LH = 120, LPAD = { top: 12, right: 8, bottom: 22, left: 40 };

function LineView({ timeSeries, peaks, peakUsers, quietMoment }) {
  const maxCount = Math.max(...timeSeries.map((d) => d.count), 1);
  const minMin   = timeSeries[0].min;
  const maxMin   = timeSeries[timeSeries.length - 1].min;
  const spanMs   = maxMin - minMin || 1;
  const cW = LW - LPAD.left - LPAD.right;
  const cH = LH - LPAD.top  - LPAD.bottom;

  const xOf = (min)   => LPAD.left + ((min - minMin) / spanMs) * cW;
  const yOf = (count) => LPAD.top  + cH - (count / maxCount) * cH;

  const points = timeSeries.map((d) => `${xOf(d.min)},${yOf(d.count)}`).join(" ");
  const first  = timeSeries[0];
  const last   = timeSeries[timeSeries.length - 1];
  const area   = [
    `${xOf(first.min)},${LPAD.top + cH}`,
    ...timeSeries.map((d) => `${xOf(d.min)},${yOf(d.count)}`),
    `${xOf(last.min)},${LPAD.top + cH}`,
  ].join(" ");

  const chartPeak = timeSeries.reduce((a, b) => b.count > a.count ? b : a);
  const mid       = timeSeries[Math.floor(timeSeries.length / 2)];
  const visible   = (p) => p && p.min >= minMin && p.min <= maxMin + 60_000;

  return (
    <svg viewBox={`0 0 ${LW} ${LH}`} className="w-full" style={{ height: "auto", maxHeight: 160 }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="aFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#53fc18" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#53fc18" stopOpacity="0"    />
        </linearGradient>
      </defs>

      {/* Gridlines */}
      {[yOf(0), yOf(maxCount)].map((y, i) => (
        <line key={i} x1={LPAD.left} y1={y} x2={LW - LPAD.right} y2={y} stroke="#1f1f1f" strokeWidth="1" />
      ))}

      <polygon points={area} fill="url(#aFill)" />
      <polyline points={points} fill="none" stroke="#53fc18" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />

      {/* Peak markers */}
      {peaks.filter((p) => visible(p)).map((p) => {
        const x = xOf(p.ts);
        return (
          <g key={p.ts}>
            <title>{fmtLong(p.ts)} — {p.count} msgs/min · {p.uniqueUsers ?? 0}u · ×{p.avg > 0 ? (p.count/p.avg).toFixed(1) : "—"}</title>
            <line x1={x} y1={LPAD.top} x2={x} y2={LPAD.top + cH} stroke="#f97316" strokeWidth="1" strokeDasharray="3 2" opacity="0.7" />
            <circle cx={x} cy={LPAD.top + 4} r="3" fill="#f97316" />
            {(p.uniqueUsers ?? 0) > 0 && <text x={x + 3} y={LPAD.top + 18} fontSize="8" fill="#f97316" opacity="0.8">{p.uniqueUsers}u</text>}
          </g>
        );
      })}

      {/* 🔥 peak users */}
      {visible(peakUsers) && (() => {
        const x = xOf(peakUsers.min);
        return (
          <g key="pu">
            <title>🔥 Mayor actividad — {fmt(peakUsers.min)} · {peakUsers.uniqueUsers} usuarios</title>
            <line x1={x} y1={LPAD.top} x2={x} y2={LPAD.top + cH} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 2" opacity="0.85" />
            <text x={x + 3} y={LPAD.top + 10} fontSize="9" fill="#ef4444" fontWeight="bold">🔥</text>
            <text x={x + 3} y={LPAD.top + 20} fontSize="8" fill="#ef4444" opacity="0.8">{peakUsers.uniqueUsers}u</text>
          </g>
        );
      })()}

      {/* 💤 quiet moment */}
      {visible(quietMoment) && (() => {
        const x = xOf(quietMoment.min);
        return (
          <g key="qm">
            <title>💤 Momento más tranquilo — {fmt(quietMoment.min)} · {quietMoment.uniqueUsers} usuario{quietMoment.uniqueUsers !== 1 ? "s" : ""}</title>
            <line x1={x} y1={LPAD.top} x2={x} y2={LPAD.top + cH} stroke="#60a5fa" strokeWidth="1.5" strokeDasharray="4 2" opacity="0.85" />
            <text x={x + 3} y={LPAD.top + 10} fontSize="9" fill="#60a5fa" fontWeight="bold">💤</text>
            <text x={x + 3} y={LPAD.top + 20} fontSize="8" fill="#60a5fa" opacity="0.8">{quietMoment.uniqueUsers}u</text>
          </g>
        );
      })()}

      {/* Max dot */}
      <circle cx={xOf(chartPeak.min)} cy={yOf(chartPeak.count)} r="3" fill="#53fc18" />

      {/* Y labels */}
      {[{ y: yOf(0), l: "0" }, { y: yOf(maxCount), l: maxCount >= 1000 ? `${(maxCount/1000).toFixed(1)}k` : String(maxCount) }].map((t) => (
        <text key={t.l} x={LPAD.left - 4} y={t.y + 4} textAnchor="end" fontSize="9" fill="#6b7280">{t.l}</text>
      ))}

      {/* X labels */}
      {[first, mid, last].map((d, i) => (
        <text key={d.min} x={xOf(d.min)} y={LH - 4}
          textAnchor={i === 0 ? "start" : i === 2 ? "end" : "middle"}
          fontSize="9" fill="#6b7280">{fmt(d.min)}</text>
      ))}
    </svg>
  );
}

// ── Heatmap ───────────────────────────────────────────────────────────────────
const CELL = 13, GAP = 2, STEP = CELL + GAP, COLS = 60, LEFT = 50, RIGHT = 52;

function heatColor(r) {
  if (r <= 0)   return "#111";
  if (r < 0.15) return "#0d2a0d";
  if (r < 0.35) return "#1a5c0a";
  if (r < 0.55) return "#53fc18";
  if (r < 0.75) return "#f59e0b";
  return "#ef4444";
}
function heatLabel(r) {
  if (r <= 0)   return "sin actividad";
  if (r < 0.15) return "muy baja";
  if (r < 0.35) return "baja";
  if (r < 0.55) return "media";
  if (r < 0.75) return "alta";
  return "pico";
}

function HeatView({ timeSeries }) {
  const maxCount = Math.max(...timeSeries.map((d) => d.count), 1);
  const total    = timeSeries.reduce((s, d) => s + d.count, 0);

  const rows = [];
  for (let i = 0; i < timeSeries.length; i += COLS) rows.push(timeSeries.slice(i, i + COLS));

  const svgW = LEFT + COLS * STEP + RIGHT;
  const svgH = rows.length * STEP + 20;

  return (
    <div className="min-w-0 overflow-x-auto">
      <svg width={svgW} height={svgH} style={{ display: "block", fontFamily: "monospace" }}>
        {[0, 10, 20, 30, 40, 50].map((col) => (
          <text key={col} x={LEFT + col * STEP} y={svgH - 2} fontSize="8" fill="#555">+{col}m</text>
        ))}
        {rows.map((row, ri) => {
          const rowMax = Math.max(...row.map((d) => d.count), 0);
          return (
            <g key={ri}>
              <text x={LEFT - 4} y={ri * STEP + CELL - 2} fontSize="9" fill="#888" textAnchor="end">
                {fmt(row[0].min)}
              </text>
              {row.map((d, ci) => (
                <rect key={d.min} x={LEFT + ci * STEP} y={ri * STEP} width={CELL} height={CELL} rx="2"
                  fill={heatColor(d.count / maxCount)} opacity={d.count === 0 ? 0.2 : 1}>
                  <title>{fmt(d.min)} — {d.count} msgs/min ({heatLabel(d.count / maxCount)})</title>
                </rect>
              ))}
              <text x={LEFT + COLS * STEP + 4} y={ri * STEP + CELL - 2} fontSize="8" fill="#555">
                {rowMax > 0 ? `max ${rowMax}` : "—"}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Summary */}
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-t border-kick-border pt-3 text-xs text-neutral-500">
        <span>Pico: <span className="font-mono text-kick-green">{Math.max(...timeSeries.map(d=>d.count))} msgs/min</span> a las <span className="text-neutral-300">{fmt(timeSeries.reduce((a,b)=>b.count>a.count?b:a).min)}</span></span>
        <span>Promedio: <span className="font-mono text-neutral-300">{Math.round(total/timeSeries.length)} msgs/min</span></span>
        <span>Total registrado: <span className="font-mono text-neutral-300">{timeSeries.length} min</span></span>
      </div>
    </div>
  );
}

// ── Unified component ─────────────────────────────────────────────────────────
export default function ActivityChart({ timeSeries, peaks = [], peakUsers = null, quietMoment = null }) {
  const [view, setView] = useState("line");
  if (!timeSeries || timeSeries.length < 2) return null;

  const chartPeak  = timeSeries.reduce((a, b) => b.count > a.count ? b : a);
  const visiblePks = peaks.filter((p) => p.min >= timeSeries[0].min);

  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-kick-border bg-kick-panel p-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400">
          <span className="font-medium text-neutral-200">Actividad del stream</span>
          {visiblePks.length > 0 && (
            <span className="flex items-center gap-1 text-orange-400">
              <span className="inline-block h-2 w-0.5 bg-orange-400" />
              {visiblePks.length} pico{visiblePks.length !== 1 ? "s" : ""}
              {visiblePks[visiblePks.length-1]?.uniqueUsers > 0 && (
                <span className="text-orange-400/70">· {visiblePks[visiblePks.length-1].uniqueUsers}u en el último</span>
              )}
            </span>
          )}
          {peakUsers   && <span className="text-red-400">🔥 {fmt(peakUsers.min)}</span>}
          {quietMoment && <span className="text-blue-400">💤 {fmt(quietMoment.min)}</span>}
          <span>máx: <span className="font-mono text-kick-green">{chartPeak.count.toLocaleString()}</span> a las {fmt(chartPeak.min)}</span>
        </div>

        {/* Tab switcher */}
        <div className="flex shrink-0 overflow-hidden rounded-lg border border-kick-border">
          <button onClick={() => setView("line")}
            className={`px-3 py-1.5 text-xs transition ${view === "line" ? "bg-kick-green/20 text-kick-green" : "text-neutral-400 hover:text-neutral-200"}`}>
            Gráfico
          </button>
          <button onClick={() => setView("heat")}
            className={`border-l border-kick-border px-3 py-1.5 text-xs transition ${view === "heat" ? "bg-kick-green/20 text-kick-green" : "text-neutral-400 hover:text-neutral-200"}`}>
            Heatmap
          </button>
        </div>
      </div>

      {/* View */}
      {view === "line"
        ? <LineView timeSeries={timeSeries} peaks={peaks} peakUsers={peakUsers} quietMoment={quietMoment} />
        : <HeatView timeSeries={timeSeries} />
      }
    </div>
  );
}
