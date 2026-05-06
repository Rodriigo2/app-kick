"use client";

const MIN_W    = 3;  // px per minute block
const BAR_H    = 28; // px height of the activity bar
const LABEL_H  = 16; // px height for x-axis labels

function fmt(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function fmtDur(mins) {
  const h = Math.floor(mins / 60), m = mins % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

// Compute runs of consecutive active/inactive blocks
function getRuns(active) {
  const runs = [];
  let cur = null;
  active.forEach((a, i) => {
    if (!cur || cur.active !== a) {
      cur = { active: a, start: i, len: 1 };
      runs.push(cur);
    } else {
      cur.len += 1;
    }
  });
  return runs;
}

export default function ViewerJourney({ journey }) {
  const { buckets, active, activeMin, totalMin, score } = journey;
  if (!buckets || buckets.length < 2) return null;

  const runs         = getRuns(active);
  const pctActive    = totalMin > 0 ? ((activeMin / totalMin) * 100).toFixed(0) : 0;
  const firstActive  = buckets[active.indexOf(true)];
  const lastActive   = buckets[active.lastIndexOf(true)];
  const longestRun   = runs.filter((r) => r.active).reduce((a, b) => b.len > a.len ? b : a, { len: 0 });
  const totalW       = totalMin * MIN_W;

  // X-axis tick every 60 minutes (or 30 if short stream)
  const tickEvery = totalMin > 120 ? 60 : 30;
  const ticks     = [];
  for (let i = 0; i < totalMin; i += tickEvery) {
    if (i > 0) ticks.push({ idx: i, ts: buckets[i] });
  }

  return (
    <div className="mx-6 mb-3 flex flex-col gap-3 rounded-xl border border-kick-border bg-black/40 px-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Actividad durante el stream
        </span>
        <div className="flex items-center gap-4 text-xs text-neutral-500">
          <span>
            <span className="font-semibold text-kick-green">{activeMin}</span> / {totalMin} min activo
            <span className="ml-1 text-neutral-600">({pctActive}%)</span>
          </span>
          {longestRun.len >= 2 && (
            <span className="text-orange-400">🔥 racha máx {fmtDur(longestRun.len)}</span>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="overflow-x-auto">
        <div style={{ width: totalW, minWidth: "100%" }}>
          {/* Activity bar */}
          <div className="relative flex" style={{ height: BAR_H }}>
            {runs.map((run, i) => (
              <div
                key={i}
                title={
                  run.active
                    ? `Activo: ${fmt(buckets[run.start])} → ${fmt(buckets[run.start + run.len - 1])} (${fmtDur(run.len)})`
                    : `Inactivo: ${fmt(buckets[run.start])} → ${fmt(buckets[run.start + run.len - 1])} (${fmtDur(run.len)})`
                }
                className={`transition-opacity hover:opacity-80 ${i === 0 ? "rounded-l-md" : ""} ${i === runs.length - 1 ? "rounded-r-md" : ""}`}
                style={{
                  width:      run.len * MIN_W,
                  height:     BAR_H,
                  background: run.active
                    ? `rgba(83,252,24,${0.4 + 0.6 * Math.min(1, run.len / 10)})`
                    : "rgba(255,255,255,0.04)",
                  flexShrink: 0,
                }}
              />
            ))}
          </div>

          {/* X-axis labels */}
          <div className="relative mt-1" style={{ height: LABEL_H }}>
            {/* Start */}
            <span className="absolute left-0 text-[10px] text-neutral-600">
              {fmt(buckets[0])}
            </span>
            {/* Middle ticks */}
            {ticks.map((t) => (
              <span
                key={t.idx}
                className="absolute text-[10px] text-neutral-600 -translate-x-1/2"
                style={{ left: t.idx * MIN_W }}
              >
                {fmt(t.ts)}
              </span>
            ))}
            {/* End */}
            <span className="absolute right-0 text-[10px] text-neutral-600">
              {fmt(buckets[buckets.length - 1])}
            </span>
          </div>
        </div>
      </div>

      {/* Summary row */}
      <div className="flex flex-wrap gap-x-5 gap-y-1 border-t border-kick-border pt-2 text-xs text-neutral-500">
        {firstActive && (
          <span>Primer msg: <span className="text-neutral-300">{fmt(firstActive)}</span></span>
        )}
        {lastActive && (
          <span>Último msg: <span className="text-neutral-300">{fmt(lastActive)}</span></span>
        )}
        <span>Viewer Score: <span className="font-semibold text-kick-green">{score.toLocaleString()}</span></span>
      </div>
    </div>
  );
}
