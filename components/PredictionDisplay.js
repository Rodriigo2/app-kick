"use client";

const STATUS_LABEL = {
  active:   { text: "Abierta",    dot: "bg-kick-green animate-pulse" },
  locked:   { text: "Bloqueada",  dot: "bg-yellow-400" },
  resolved: { text: "Resuelta",   dot: "bg-blue-400" },
};

export default function PredictionDisplay({ prediction }) {
  if (!prediction) return null;

  const { title, outcomes, status, winnerId } = prediction;
  const cfg        = STATUS_LABEL[status] ?? STATUS_LABEL.active;
  const totalPoints = outcomes.reduce((s, o) => s + (o.totalPoints ?? 0), 0);
  const totalUsers  = outcomes.reduce((s, o) => s + (o.totalUsers  ?? 0), 0);
  const maxPoints   = Math.max(...outcomes.map((o) => o.totalPoints ?? 0), 1);

  // Default colors per outcome position
  const COLORS = ["#60a5fa", "#f97316", "#a78bfa", "#34d399", "#f43f5e"];

  return (
    <div className={`flex flex-col gap-3 rounded-xl border p-4 ${
      status === "resolved" ? "border-blue-400/30 bg-blue-400/5" :
      status === "locked"   ? "border-yellow-400/30 bg-yellow-400/5" :
                              "border-kick-green/30 bg-kick-green/5"
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
          <h2 className="text-sm font-semibold text-neutral-100">
            Predicción · <span className="text-neutral-400">{cfg.text}</span>
          </h2>
        </div>
        <div className="flex items-center gap-3 text-xs text-neutral-500">
          <span>{totalPoints.toLocaleString()} puntos</span>
          <span>{totalUsers.toLocaleString()} participantes</span>
        </div>
      </div>

      {/* Question */}
      <p className="font-medium text-neutral-100">{title}</p>

      {/* Outcomes */}
      <div className="flex flex-col gap-2">
        {outcomes.map((o, i) => {
          const pct     = totalPoints > 0 ? ((o.totalPoints ?? 0) / totalPoints) * 100 : 0;
          const barPct  = ((o.totalPoints ?? 0) / maxPoints) * 100;
          const color   = o.color ?? COLORS[i % COLORS.length];
          const isWinner = status === "resolved" && (o.winner || o.id === winnerId);
          const ratio   = pct > 0 ? (100 / pct).toFixed(1) : "—";

          return (
            <div key={o.id}
              className={`relative overflow-hidden rounded-lg border bg-black/40 ${
                isWinner ? "border-kick-green/60" : "border-kick-border"
              }`}>
              {/* Bar */}
              <div className="pointer-events-none absolute inset-y-0 left-0 transition-all duration-700"
                style={{ width: `${barPct}%`, background: `${color}25` }} />

              <div className="relative flex items-center justify-between px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: color }} />
                  <span className={`text-sm ${isWinner ? "font-bold text-kick-green" : "text-neutral-100"}`}>
                    {o.title}
                  </span>
                  {isWinner && <span className="text-xs text-kick-green">✓ Ganó</span>}
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <div className="font-mono text-sm font-semibold" style={{ color }}>
                      {pct.toFixed(1)}%
                    </div>
                    <div className="font-mono text-[10px] text-neutral-600">
                      ratio {ratio}x
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-xs text-neutral-300">
                      {(o.totalPoints ?? 0).toLocaleString()} pts
                    </div>
                    <div className="font-mono text-[10px] text-neutral-600">
                      {(o.totalUsers ?? 0)} usuarios
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {status === "locked" && (
        <p className="text-center text-xs text-yellow-400/70">
          🔒 Predicción cerrada — esperando resultado
        </p>
      )}
    </div>
  );
}
