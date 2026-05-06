"use client";

import { useState } from "react";

export default function TopWords({ wordRanking }) {
  const [expanded, setExpanded] = useState(false);

  if (!wordRanking || wordRanking.length === 0) return null;

  const top     = wordRanking[0]?.count || 1;
  const visible = expanded ? wordRanking : wordRanking.slice(0, 15);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-kick-border bg-kick-panel p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-100">Palabras más usadas</h2>
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <span>{wordRanking.length} palabras</span>
          {wordRanking.length > 15 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="rounded border border-kick-border px-2 py-0.5 text-neutral-300 hover:border-kick-green/50"
            >
              {expanded ? "Ver menos" : `Ver todas (${wordRanking.length})`}
            </button>
          )}
        </div>
      </div>

      {/* Fixed 3-column grid — no reflow when items are added */}
      <div className="grid grid-cols-3 gap-1.5">
        {visible.map(({ word, count }) => {
          const barPct = Math.round((count / top) * 100);
          return (
            <div
              key={word}
              className="relative overflow-hidden rounded-lg border border-kick-border bg-black/40 px-3 py-2"
            >
              <div
                className="pointer-events-none absolute inset-y-0 left-0 bg-kick-green/10"
                style={{ width: `${barPct}%` }}
              />
              <div className="relative flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium text-neutral-100">{word}</span>
                <span className="shrink-0 font-mono text-xs text-neutral-500">{count}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
