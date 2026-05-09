"use client";

import { useState } from "react";

function fmtHour(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function EmoteByHour({ emoteByHour }) {
  const [expanded, setExpanded] = useState(null); // hour ts of expanded row

  if (!emoteByHour || emoteByHour.length === 0) return null;

  const maxTotal = Math.max(...emoteByHour.map((h) => h.total), 1);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-kick-border bg-kick-panel p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-100">Emotes por hora</h2>
        <span className="text-xs text-neutral-500">{emoteByHour.length} franja{emoteByHour.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="flex flex-col gap-1.5">
        {emoteByHour.map((h) => {
          const barPct  = (h.total / maxTotal) * 100;
          const isOpen  = expanded === h.hour;

          return (
            <div key={h.hour} className="flex flex-col gap-1">
              <button
                onClick={() => setExpanded(isOpen ? null : h.hour)}
                className="relative flex items-center gap-3 overflow-hidden rounded-lg border border-kick-border/60 px-3 py-2 text-left hover:bg-white/5 focus:outline-none"
              >
                {/* Bar */}
                <div className="pointer-events-none absolute inset-y-0 left-0 bg-kick-green/10"
                  style={{ width: `${barPct}%` }} />

                {/* Hour label */}
                <span className="relative shrink-0 font-mono text-xs text-neutral-400 w-10">
                  {fmtHour(h.hour)}
                </span>

                {/* Top emote */}
                {h.topEmote ? (
                  <div className="relative flex flex-1 items-center gap-2">
                    {h.topEmote.url
                      ? <img src={h.topEmote.url} alt={h.topEmote.name} className="h-5 w-auto object-contain shrink-0" loading="lazy" />
                      : <span className="text-xs text-neutral-500">{h.topEmote.name}</span>
                    }
                    <span className="truncate text-sm font-medium text-neutral-100">{h.topEmote.name}</span>
                    <span className="shrink-0 font-mono text-xs text-kick-green">×{h.topEmote.count}</span>
                  </div>
                ) : (
                  <span className="relative flex-1 text-xs text-neutral-600">sin emotes</span>
                )}

                {/* Total + expand indicator */}
                <div className="relative flex items-center gap-2 shrink-0">
                  <span className="font-mono text-xs text-neutral-500">{h.total} total</span>
                  {h.top5?.length > 1 && (
                    <span className="text-neutral-600 text-[10px]">{isOpen ? "▲" : "▼"}</span>
                  )}
                </div>
              </button>

              {/* Expanded: top 5 emotes of this hour */}
              {isOpen && h.top5?.length > 1 && (
                <div className="ml-3 flex flex-wrap gap-2 rounded-lg border border-kick-border/40 bg-black/30 px-3 py-2">
                  {h.top5.map((e, i) => (
                    <div key={e.name} className="flex items-center gap-1.5">
                      <span className="text-[10px] text-neutral-600">{i + 1}.</span>
                      {e.url
                        ? <img src={e.url} alt={e.name} className="h-5 w-auto object-contain" loading="lazy" />
                        : null}
                      <span className="text-xs text-neutral-300">{e.name}</span>
                      <span className="font-mono text-[10px] text-neutral-500">×{e.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
