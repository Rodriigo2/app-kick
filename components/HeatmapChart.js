"use client";

function fmt(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function heatColor(ratio) {
  if (ratio <= 0)   return "#111";
  if (ratio < 0.15) return "#0d2a0d";
  if (ratio < 0.35) return "#1a5c0a";
  if (ratio < 0.55) return "#53fc18";
  if (ratio < 0.75) return "#f59e0b";
  return "#ef4444";
}

function heatLabel(ratio) {
  if (ratio <= 0)   return "sin actividad";
  if (ratio < 0.15) return "muy baja";
  if (ratio < 0.35) return "baja";
  if (ratio < 0.55) return "media";
  if (ratio < 0.75) return "alta";
  return "pico máximo";
}

const CELL  = 14;
const GAP   = 2;
const STEP  = CELL + GAP;
const COLS  = 60;
const LEFT  = 52; // space for hour label
const RIGHT = 60; // space for row stats

export default function HeatmapChart({ timeSeries }) {
  if (!timeSeries || timeSeries.length < 2) return null;

  const maxCount = Math.max(...timeSeries.map((d) => d.count), 1);
  const total    = timeSeries.reduce((s, d) => s + d.count, 0);

  // Group into rows of 60 min (1 hour per row)
  const rows = [];
  for (let i = 0; i < timeSeries.length; i += COLS) {
    rows.push(timeSeries.slice(i, i + COLS));
  }

  const svgW = LEFT + COLS * STEP + RIGHT;
  const svgH = rows.length * STEP + 28; // +28 for col labels at bottom

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-kick-border bg-kick-panel p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-neutral-100">Mapa de actividad del stream</h2>
          <p className="text-xs text-neutral-500">
            Cada celda = 1 minuto · {timeSeries.length} min registrados · {total.toLocaleString()} msgs totales
          </p>
        </div>
        {/* Legend */}
        <div className="flex shrink-0 items-center gap-1.5 text-[10px] text-neutral-500">
          {[
            { color: "#111",    label: "0"    },
            { color: "#0d2a0d", label: "bajo" },
            { color: "#1a5c0a", label: ""     },
            { color: "#53fc18", label: "med"  },
            { color: "#f59e0b", label: ""     },
            { color: "#ef4444", label: "pico" },
          ].map((l, i) => (
            <span key={i} className="flex items-center gap-0.5">
              <span className="inline-block h-3 w-3 rounded-sm border border-white/5"
                style={{ background: l.color }} />
              {l.label && <span>{l.label}</span>}
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg width={svgW} height={svgH} style={{ display: "block", fontFamily: "monospace" }}>

          {/* Column headers: 0, 10, 20, 30, 40, 50 (every 10 min) */}
          {[0, 10, 20, 30, 40, 50].map((col) => (
            <text key={col} x={LEFT + col * STEP} y={svgH - 2}
              fontSize="8" fill="#555" textAnchor="start">
              +{col}m
            </text>
          ))}

          {rows.map((row, rowIdx) => {
            const rowTotal  = row.reduce((s, d) => s + d.count, 0);
            const rowMax    = Math.max(...row.map((d) => d.count), 0);
            const rowAvg    = rowTotal > 0 ? Math.round(rowTotal / row.length) : 0;
            const hourLabel = fmt(row[0].min);
            const y         = rowIdx * STEP;

            return (
              <g key={rowIdx}>
                {/* Hour label (left) */}
                <text x={LEFT - 4} y={y + CELL - 2}
                  fontSize="9" fill="#888" textAnchor="end">
                  {hourLabel}
                </text>

                {/* Minute cells */}
                {row.map((d, colIdx) => {
                  const ratio = d.count / maxCount;
                  return (
                    <rect key={d.min}
                      x={LEFT + colIdx * STEP} y={y}
                      width={CELL} height={CELL} rx="2"
                      fill={heatColor(ratio)}
                      opacity={d.count === 0 ? 0.25 : 1}
                    >
                      <title>
                        {fmt(d.min)} — {d.count} msgs/min ({heatLabel(ratio)})
                      </title>
                    </rect>
                  );
                })}

                {/* Row stats (right) */}
                <text x={LEFT + COLS * STEP + 6} y={y + CELL - 2}
                  fontSize="8" fill="#555">
                  {rowMax > 0 ? `max ${rowMax}` : "—"}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Footer summary */}
      <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-kick-border pt-3 text-xs text-neutral-500">
        <span>
          Minuto más activo:{" "}
          <span className="font-semibold text-neutral-200">
            {fmt(timeSeries.reduce((a, b) => b.count > a.count ? b : a).min)}
          </span>
          {" "}·{" "}
          <span className="font-mono text-kick-green">
            {Math.max(...timeSeries.map((d) => d.count))} msgs/min
          </span>
        </span>
        <span>
          Minuto más tranquilo:{" "}
          <span className="font-semibold text-neutral-200">
            {fmt(timeSeries.filter(d => d.count > 0).reduce((a, b) => b.count < a.count ? b : a, timeSeries.find(d => d.count > 0) ?? timeSeries[0]).min)}
          </span>
          {" "}·{" "}
          <span className="font-mono text-neutral-400">
            {Math.min(...timeSeries.filter(d => d.count > 0).map((d) => d.count))} msgs/min
          </span>
        </span>
        <span>
          Promedio:{" "}
          <span className="font-mono text-neutral-300">
            {Math.round(total / timeSeries.length)} msgs/min
          </span>
        </span>
      </div>
    </div>
  );
}
