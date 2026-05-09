"use client";

import { fmtTime } from "@/lib/formatters";

const BADGE_FILES = {
  broadcaster:      "/badges/broadcaster.svg",
  moderator:        "/badges/moderator.svg",
  global_moderator: "/badges/moderator.svg",
  global_mod:       "/badges/moderator.svg",
  admin:            "/badges/moderator.svg",
  global_admin:     "/badges/moderator.svg",
};

export default function ActiveMods({ activeMods = [] }) {
  if (!activeMods.length) return null;

  const broadcaster = activeMods.find((m) => m.isBroadcaster);
  const mods        = activeMods.filter((m) => !m.isBroadcaster);
  const topMod      = mods[0]; // already sorted by count desc

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-kick-border bg-kick-panel p-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <img src="/badges/moderator.svg" alt="Mod" className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Mods activos</span>
        <span className="rounded-full bg-white/5 px-2 py-0.5 font-mono text-[10px] text-neutral-500">{mods.length}</span>
      </div>

      {/* Top mod highlight */}
      {topMod && (
        <div className="flex items-center gap-3 rounded-lg border border-kick-green/20 bg-kick-green/5 px-3 py-2.5">
          <img src={BADGE_FILES[topMod.badgeType] ?? "/badges/moderator.svg"} alt="Mod" className="h-5 w-5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-kick-green truncate">{topMod.username}</span>
              <span className="text-[10px] text-neutral-500 shrink-0">más activo</span>
            </div>
            <div className="text-[10px] text-neutral-500">{topMod.count} msgs · hasta {fmtTime(topMod.lastSeen)}</div>
          </div>
          <span className="font-mono text-lg font-bold text-kick-green/60">#{1}</span>
        </div>
      )}

      {/* Rest of mods */}
      {(broadcaster ? [broadcaster, ...mods.slice(1)] : mods.slice(1)).length > 0 && (
        <div className="flex flex-col gap-1">
          {broadcaster && (
            <ModRow mod={broadcaster} badge={BADGE_FILES.broadcaster} accent="text-neutral-300" rank={null} />
          )}
          {mods.slice(1).map((m, i) => (
            <ModRow key={m.username} mod={m} badge={BADGE_FILES[m.badgeType] ?? "/badges/moderator.svg"} accent="text-neutral-400" rank={i + 2} />
          ))}
        </div>
      )}
    </div>
  );
}

function ModRow({ mod, badge, accent, rank }) {
  return (
    <div className="flex items-center gap-2.5 rounded px-2 py-1.5 hover:bg-white/5">
      <img src={badge} alt="Mod" className="h-4 w-4 shrink-0 opacity-70" />
      <span className={`flex-1 truncate text-xs font-medium ${accent}`}>{mod.username}</span>
      <span className="font-mono text-[10px] text-neutral-600">{mod.count} msgs</span>
      {rank && <span className="w-5 text-right font-mono text-[10px] text-neutral-700">#{rank}</span>}
    </div>
  );
}
