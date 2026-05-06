"use client";

const SCORE_BAR = (score) =>
  score >= 0.85 ? "bg-red-500" : score >= 0.6 ? "bg-orange-400" : "bg-yellow-400";

export default function BotList({ bots }) {
  if (!bots || bots.length === 0) return null;

  const confirmed  = bots.filter((b) => b.score >= 0.85);
  const suspected  = bots.filter((b) => b.score < 0.85);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-kick-border bg-kick-panel p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-100">Detección de bots</h2>
        <div className="flex items-center gap-3 text-xs">
          {confirmed.length > 0 && (
            <span className="flex items-center gap-1.5 rounded-full bg-red-500/20 px-2 py-0.5 text-red-400">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
              {confirmed.length} bot{confirmed.length !== 1 ? "s" : ""}
            </span>
          )}
          {suspected.length > 0 && (
            <span className="flex items-center gap-1.5 rounded-full bg-orange-500/20 px-2 py-0.5 text-orange-400">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
              {suspected.length} sospechoso{suspected.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-kick-border">
        <div className="grid grid-cols-[1fr_80px_100px] gap-2 border-b border-kick-border bg-black/40 px-3 py-2 text-[11px] uppercase tracking-wider text-neutral-500">
          <div>Usuario</div>
          <div className="text-center">Msgs</div>
          <div className="text-right">Confianza</div>
        </div>

        <div className="max-h-48 overflow-y-auto">
          {bots.map((b) => (
            <div
              key={b.username}
              className="grid grid-cols-[1fr_80px_100px] items-center gap-2 border-b border-kick-border/60 px-3 py-2 text-sm last:border-b-0"
            >
              <div className="flex items-center gap-2 truncate">
                <span
                  className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase text-white"
                  style={{ background: b.score >= 0.85 ? "#ef4444" : b.score >= 0.6 ? "#f97316" : "#eab308" }}
                >
                  {b.label}
                </span>
                <span className="truncate font-medium text-neutral-100">{b.username}</span>
              </div>
              <div className="text-center font-mono text-neutral-400">{b.count}</div>
              <div className="flex items-center justify-end gap-2">
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full rounded-full ${SCORE_BAR(b.score)}`}
                    style={{ width: `${Math.round(b.score * 100)}%` }}
                  />
                </div>
                <span className="font-mono text-xs text-neutral-500">
                  {Math.round(b.score * 100)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
