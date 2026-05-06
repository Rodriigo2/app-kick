"use client";

function fmt(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function PeakList({ peaks }) {
  if (!peaks || peaks.length === 0) return null;

  const maxCount = Math.max(...peaks.map((p) => p.count));

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-kick-border bg-kick-panel p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-100">Momentos del stream</h2>
        <span className="text-xs text-neutral-500">
          {peaks.length} pico{peaks.length !== 1 ? "s" : ""} detectado{peaks.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        {[...peaks].reverse().map((p, i) => {
          const mult   = p.avg > 0 ? (p.count / p.avg).toFixed(1) : "—";
          const barPct = Math.round((p.count / maxCount) * 100);
          const rank   = peaks.length - i;

          return (
            <div key={p.ts}
              className="relative flex items-center gap-3 overflow-hidden rounded-lg border border-kick-border/60 px-3 py-2">
              <div className="pointer-events-none absolute inset-y-0 left-0 bg-kick-green/10"
                style={{ width: `${barPct}%` }} />

              <span className="relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-kick-green/20 font-mono text-[10px] font-bold text-kick-green">
                {rank}
              </span>
              <span className="relative font-mono text-sm text-neutral-300">{fmt(p.ts)}</span>
              <div className="relative ml-auto flex items-center gap-3">
                <span className="font-mono text-sm font-semibold text-neutral-100">
                  {p.count} <span className="text-xs font-normal text-neutral-500">msgs/min</span>
                </span>
                <span className="rounded-full bg-kick-green/15 px-2 py-0.5 font-mono text-xs font-semibold text-kick-green">
                  ×{mult}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
