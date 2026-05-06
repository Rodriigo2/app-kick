"use client";

function fmt(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function MomentsBar({ peakUsers, quietMoment }) {
  if (!peakUsers && !quietMoment) return null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {/* Mayor actividad */}
      {peakUsers && (
        <div className="flex items-center gap-4 rounded-xl border border-kick-green/30 bg-kick-green/5 px-5 py-3">
          <span className="text-2xl">🔥</span>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-neutral-500">Mayor actividad</p>
            <p className="font-mono text-xl font-bold text-kick-green">
              {peakUsers.uniqueUsers} usuarios
            </p>
            <p className="text-xs text-neutral-400">a las {fmt(peakUsers.min)}</p>
          </div>
        </div>
      )}

      {/* Momento más tranquilo */}
      {quietMoment && (
        <div className="flex items-center gap-4 rounded-xl border border-neutral-700/50 bg-white/[0.02] px-5 py-3">
          <span className="text-2xl">💤</span>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-neutral-500">Momento más tranquilo</p>
            <p className="font-mono text-xl font-bold text-neutral-300">
              {quietMoment.uniqueUsers} usuario{quietMoment.uniqueUsers !== 1 ? "s" : ""}
            </p>
            <p className="text-xs text-neutral-500">a las {fmt(quietMoment.min)}</p>
          </div>
        </div>
      )}
    </div>
  );
}
