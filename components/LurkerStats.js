"use client";

const TIERS = [
  { key: "top",     label: "Top",       desc: "Más de 20 msgs · muy activos",   color: "#53fc18" },
  { key: "regular", label: "Regulares", desc: "6 a 20 msgs · participan bien",   color: "#60a5fa" },
  { key: "casual",  label: "Casuales",  desc: "2 a 5 msgs · participan poco",    color: "#f97316" },
  { key: "oneTime", label: "One-time",  desc: "Solo 1 msg · casi lurkers",        color: "#6b7280" },
];

export default function LurkerStats({ lurkerStats }) {
  if (!lurkerStats || lurkerStats.viewers === 0) return null;

  const { viewers, chatters, lurkers, lurkerRate, engagementRate, oneTime, casual, regular, top } = lurkerStats;
  const totalChatters = oneTime + casual + regular + top;
  const counts = { top, regular, casual, oneTime };

  return (
    <div className="flex h-full flex-col gap-3 rounded-xl border border-kick-border bg-kick-panel p-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-neutral-400">Engagement</span>
        <div className="text-right">
          <div className="text-[10px] text-neutral-600">{viewers.toLocaleString()} viewers ahora</div>
          <div className="text-[10px] text-neutral-700">chatters activos últimos 5 min</div>
        </div>
      </div>

      {/* Main split */}
      <div className="flex items-center gap-2">
        {/* Chatters big */}
        <div className="flex flex-1 flex-col gap-0.5">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-xl font-bold text-neutral-100">{chatters.toLocaleString()}</span>
            <span className="font-mono text-sm font-semibold text-kick-green">{engagementRate}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
            <div className="h-full rounded-full bg-kick-green transition-all duration-500" style={{ width: `${engagementRate}%` }} />
          </div>
          <span className="text-[10px] text-neutral-600">chatters</span>
        </div>

        <div className="h-8 w-px bg-kick-border" />

        {/* Lurkers */}
        <div className="flex flex-1 flex-col gap-0.5">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-xl font-bold text-neutral-500">{lurkers.toLocaleString()}</span>
            <span className="font-mono text-sm text-neutral-600">{lurkerRate}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
            <div className="h-full rounded-full bg-neutral-700 transition-all duration-500" style={{ width: `${lurkerRate}%` }} />
          </div>
          <span className="text-[10px] text-neutral-600">lurkers</span>
        </div>
      </div>

      {/* Chatter tiers — stacked single bar */}
      {totalChatters > 0 && (
        <div className="flex flex-col gap-1.5">
          {/* Stacked bar */}
          <div className="flex h-2 w-full overflow-hidden rounded-full">
            {TIERS.map(({ key, color }) => {
              const pct = totalChatters > 0 ? (counts[key] / totalChatters) * 100 : 0;
              return pct > 0 ? (
                <div key={key} style={{ width: `${pct}%`, background: color }} title={`${key}: ${counts[key]}`} />
              ) : null;
            })}
          </div>
          {/* Legend */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {TIERS.map(({ key, label, desc, color }) => (
              <div key={key} className="flex items-start justify-between gap-1">
                <div className="flex items-start gap-1.5">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-medium text-neutral-400">{label}</span>
                    <span className="text-[9px] text-neutral-600">{desc}</span>
                  </div>
                </div>
                <span className="font-mono text-[10px] text-neutral-300">{counts[key]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insight */}
      <p className="text-[10px] text-neutral-600">
        {engagementRate >= 20 ? "🔥 Chat muy activo" : engagementRate >= 10 ? "✅ Engagement normal" : engagementRate >= 5 ? "📊 Chat moderado" : "😴 Mayoría lurkers"}
      </p>
    </div>
  );
}
