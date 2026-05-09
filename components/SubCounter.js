"use client";

import { useState } from "react";
import { fmtTime } from "@/lib/formatters";

export default function SubCounter({ subCount, giftCount, subEvents }) {
  const [expanded, setExpanded] = useState(false);

  const total = subCount + giftCount;
  if (total === 0 && !subEvents?.length) return null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-kick-border bg-kick-panel p-4">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="font-mono text-2xl font-bold text-kick-green">{total}</span>
            <span className="text-[10px] uppercase tracking-wide text-neutral-500">subs totales</span>
          </div>
          {subCount > 0 && (
            <div className="flex flex-col border-l border-kick-border pl-4">
              <span className="font-mono text-lg font-semibold text-neutral-100">{subCount}</span>
              <span className="text-[10px] uppercase tracking-wide text-neutral-500">nuevos</span>
            </div>
          )}
          {giftCount > 0 && (
            <div className="flex flex-col border-l border-kick-border pl-4">
              <span className="font-mono text-lg font-semibold text-purple-400">{giftCount}</span>
              <span className="text-[10px] uppercase tracking-wide text-neutral-500">gifted</span>
            </div>
          )}
        </div>
        {subEvents?.length > 0 && (
          <button onClick={() => setExpanded((v) => !v)}
            className="rounded-lg border border-kick-border px-3 py-1 text-xs text-neutral-400 hover:border-kick-green/50 hover:text-neutral-200">
            {expanded ? "Ocultar" : "Historial"}
          </button>
        )}
      </div>

      {/* Event history */}
      {expanded && subEvents?.length > 0 && (
        <div className="max-h-48 overflow-y-auto rounded-lg border border-kick-border bg-black/40">
          {[...subEvents].reverse().map((ev, i) => (
            <div key={i} className="flex items-center gap-3 border-b border-kick-border/60 px-3 py-2 text-sm last:border-b-0">
              <span className="shrink-0 font-mono text-[10px] text-neutral-600">{fmtTime(ev.ts)}</span>
              {ev.type === "sub" ? (
                <>
                  <span className="h-2 w-2 shrink-0 rounded-full bg-kick-green" />
                  <span className="flex-1 font-medium text-neutral-100">{ev.username}</span>
                  <span className="text-xs text-neutral-500">sub{ev.months > 1 ? ` · ${ev.months}m` : ""}</span>
                </>
              ) : (
                <>
                  <span className="h-2 w-2 shrink-0 rounded-full bg-purple-400" />
                  <span className="flex-1 font-medium text-neutral-100">{ev.gifter}</span>
                  <span className="shrink-0 rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold text-purple-400">
                    +{ev.quantity} gift
                  </span>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
