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
    <div className="rounded-xl border border-kick-border bg-kick-panel px-5 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          {active ? (
            <>
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-yellow-400" />
              <span className="text-neutral-400">Cargando historial…</span>
            </>
          ) : (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-kick-green" />
              <span className="text-neutral-400">
                Historial cargado
                {cappedAt === "messages" && " · límite alcanzado"}
                {cappedAt === "pages"    && " · límite alcanzado"}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-4 font-mono text-xs text-neutral-500">
          <span>{count.toLocaleString()} msg</span>
          {oldestTs && liveStartedAt && (
            <span>desde {fmt(oldestTs)} · inicio {fmt(liveStartedAt)}</span>
          )}
        </div>
      </div>

      {progress !== null && active && (
        <div className="mt-2 h-0.5 w-full overflow-hidden rounded-full bg-white/5">
          <div className="h-full rounded-full bg-kick-green/60 transition-all duration-500"
            style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}
