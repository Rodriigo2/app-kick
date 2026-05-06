"use client";

const W   = 600;
const H   = 80;
const PAD = { top: 8, right: 8, bottom: 20, left: 40 };

function fmt(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function SpeedChart({ timeSeries, peaks = [], peakUsers = null, quietMoment = null }) {
  if (!timeSeries || timeSeries.length < 2) return null;

  const maxCount = Math.max(...timeSeries.map((d) => d.count), 1);
  const minMin   = timeSeries[0].min;
  const maxMin   = timeSeries[timeSeries.length - 1].min;
  const spanMs   = maxMin - minMin || 1;
  const chartW   = W - PAD.left - PAD.right;
  const chartH   = H - PAD.top  - PAD.bottom;

  const xOf = (min)   => PAD.left + ((min - minMin) / spanMs) * chartW;
  const yOf = (count) => PAD.top  + chartH - (count / maxCount) * chartH;

  const points = timeSeries.map((d) => `${xOf(d.min)},${yOf(d.count)}`).join(" ");
  const first  = timeSeries[0];
  const last   = timeSeries[timeSeries.length - 1];
  const area   = [
    `${xOf(first.min)},${PAD.top + chartH}`,
    ...timeSeries.map((d) => `${xOf(d.min)},${yOf(d.count)}`),
    `${xOf(last.min)},${PAD.top + chartH}`,
  ].join(" ");

  const chartPeak = timeSeries.reduce((a, b) => (b.count > a.count ? b : a));
  const yTicks    = [
    { y: yOf(0),        label: "0" },
    { y: yOf(maxCount), label: maxCount >= 1000 ? `${(maxCount / 1000).toFixed(1)}k` : String(maxCount) },
  ];
  const mid    = timeSeries[Math.floor(timeSeries.length / 2)];
  const xTicks = [first, mid, last];

  // Peaks that fall within the visible time window
  const visiblePeaks = peaks.filter((p) => p.ts >= minMin && p.ts <= maxMin + 60_000);

  return (
    <div className="rounded-xl border border-kick-border bg-kick-panel p-4">
      <div className="mb-2 flex items-center justify-between text-xs text-neutral-400">
        <span className="font-medium text-neutral-200">Mensajes / minuto</span>
        <div className="flex flex-wrap items-center gap-3">
          {visiblePeaks.length > 0 && (() => {
            const last = visiblePeaks[visiblePeaks.length - 1];
            return (
              <span className="flex items-center gap-1.5 text-orange-400">
                <span className="inline-block h-2 w-0.5 bg-orange-400" />
                <span>{visiblePeaks.length} pico{visiblePeaks.length !== 1 ? "s" : ""}</span>
                {last?.uniqueUsers > 0 && (
                  <span className="text-orange-400/70">· {last.uniqueUsers} usuarios en el último</span>
                )}
              </span>
            );
          })()}
          {peakUsers && <span className="flex items-center gap-1 text-red-400">🔥 {fmt(peakUsers.min)}</span>}
          {quietMoment && <span className="flex items-center gap-1 text-blue-400">💤 {fmt(quietMoment.min)}</span>}
          <span>
            máx:{" "}
            <span className="font-mono text-kick-green">{chartPeak.count.toLocaleString()}</span>{" "}
            a las {fmt(chartPeak.min)}
          </span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: H }}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#53fc18" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#53fc18" stopOpacity="0"    />
          </linearGradient>
        </defs>

        {yTicks.map((t) => (
          <line key={t.label} x1={PAD.left} y1={t.y} x2={W - PAD.right} y2={t.y}
            stroke="#1f1f1f" strokeWidth="1" />
        ))}

        <polygon points={area} fill="url(#chartFill)" />
        <polyline points={points} fill="none" stroke="#53fc18"
          strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />

        {/* Message-count peak markers (orange) */}
        {visiblePeaks.map((p) => {
          const x = xOf(p.ts);
          const label = `${p.count} msgs/min · ${p.uniqueUsers ?? 0} usuarios · ×${p.avg > 0 ? (p.count / p.avg).toFixed(1) : "—"}`;
          return (
            <g key={p.ts}>
              <title>{fmt(p.ts)} — {label}</title>
              <line x1={x} y1={PAD.top} x2={x} y2={PAD.top + chartH}
                stroke="#f97316" strokeWidth="1" strokeDasharray="3 2" opacity="0.7" />
              <circle cx={x} cy={PAD.top + 4} r="3" fill="#f97316" />
              {p.uniqueUsers > 0 && (
                <text x={x + 4} y={PAD.top + 20} fontSize="8" fill="#f97316" opacity="0.8">
                  {p.uniqueUsers}u
                </text>
              )}
            </g>
          );
        })}

        {/* Most active users marker (🔥 red) */}
        {peakUsers && peakUsers.min >= minMin && peakUsers.min <= maxMin + 60_000 && (() => {
          const x = xOf(peakUsers.min);
          return (
            <g key="peak-users" style={{ cursor: "help" }}>
              <title>🔥 Mayor actividad — {fmt(peakUsers.min)}{"\n"}{peakUsers.uniqueUsers} usuarios escribiendo al mismo tiempo</title>
              <line x1={x} y1={PAD.top} x2={x} y2={PAD.top + chartH}
                stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 2" opacity="0.85" />
              <text x={x + 3} y={PAD.top + 10} fontSize="9" fill="#ef4444" fontWeight="bold">🔥</text>
              <text x={x + 3} y={PAD.top + 20} fontSize="8" fill="#ef4444" opacity="0.8">
                {peakUsers.uniqueUsers}u
              </text>
            </g>
          );
        })()}

        {/* Quietest moment marker (💤 blue) */}
        {quietMoment && quietMoment.min >= minMin && quietMoment.min <= maxMin + 60_000 && (() => {
          const x = xOf(quietMoment.min);
          return (
            <g key="quiet-moment" style={{ cursor: "help" }}>
              <title>💤 Momento más tranquilo — {fmt(quietMoment.min)}{"\n"}{quietMoment.uniqueUsers} usuario{quietMoment.uniqueUsers !== 1 ? "s" : ""} escribiendo</title>
              <line x1={x} y1={PAD.top} x2={x} y2={PAD.top + chartH}
                stroke="#60a5fa" strokeWidth="1.5" strokeDasharray="4 2" opacity="0.85" />
              <text x={x + 3} y={PAD.top + 10} fontSize="9" fill="#60a5fa" fontWeight="bold">💤</text>
              <text x={x + 3} y={PAD.top + 20} fontSize="8" fill="#60a5fa" opacity="0.8">
                {quietMoment.uniqueUsers}u
              </text>
            </g>
          );
        })()}

        <circle cx={xOf(chartPeak.min)} cy={yOf(chartPeak.count)} r="3" fill="#53fc18" />

        {yTicks.map((t) => (
          <text key={t.label} x={PAD.left - 4} y={t.y + 4} textAnchor="end" fontSize="9" fill="#6b7280">
            {t.label}
          </text>
        ))}
        {xTicks.map((d, i) => (
          <text key={d.min} x={xOf(d.min)} y={H - 4}
            textAnchor={i === 0 ? "start" : i === xTicks.length - 1 ? "end" : "middle"}
            fontSize="9" fill="#6b7280">
            {fmt(d.min)}
          </text>
        ))}
      </svg>
    </div>
  );
}
