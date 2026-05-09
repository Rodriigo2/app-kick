"use client";

function fmt(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function BackfillBar({ backfill, liveStartedAt }) {
  const { active, count, done, cappedAt, oldestTs } = backfill;
  // Only show while loading, or when finished with actual messages.
  if (!active && (!done || count === 0)) return null;

  const progress = liveStartedAt && oldestTs
    ? Math.min(100, ((Date.now() - oldestTs) / (Date.now() - liveStartedAt)) * 100)
    : null;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-kick-border/60 bg-kick-panel/60 px-3 py-2">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${active ? "animate-pulse bg-yellow-400" : "bg-kick-green"}`} />
      <span className="text-xs text-neutral-500">
        {active ? "Cargando historial" : "Historial"}
      </span>
      <span className="font-mono text-xs text-neutral-400">{count.toLocaleString()} msgs</span>
      {oldestTs && liveStartedAt && (
        <span className="text-[10px] text-neutral-600">{fmt(oldestTs)} → {fmt(liveStartedAt)}</span>
      )}
      {progress !== null && active && (
        <div className="flex-1 h-1 overflow-hidden rounded-full bg-white/5">
          <div className="h-full rounded-full bg-kick-green/60 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}
