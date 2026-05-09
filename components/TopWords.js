"use client";

import { useState } from "react";

export default function TopWords({ topWords = [] }) {
  const [expanded, setExpanded] = useState(false);
  if (!topWords.length) return null;

  const max     = topWords[0]?.count ?? 1;
  const visible = expanded ? topWords : topWords.slice(0, 15);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-kick-border bg-kick-panel p-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Top palabras del chat</span>
          <p className="mt-0.5 text-[10px] text-neutral-600">Excluye emotes y stopwords</p>
        </div>
        {topWords.length > 15 && (
          <button onClick={() => setExpanded((v) => !v)}
            className="rounded-lg border border-kick-border px-3 py-1 text-xs text-neutral-400 hover:border-kick-green/50 hover:text-neutral-200">
            {expanded ? "Ver menos" : `Ver todas (${topWords.length})`}
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {visible.map(({ word, count }, i) => {
          const pct = Math.round((count / max) * 100);
          return (
            <div key={word} className="relative overflow-hidden rounded-lg border border-kick-border bg-black/40 px-3 py-2">
              <div className="pointer-events-none absolute inset-y-0 left-0 bg-kick-green/10" style={{ width: `${pct}%` }} />
              <div className="relative flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="shrink-0 font-mono text-[10px] text-neutral-600">{i + 1}</span>
                  <span className="truncate text-sm font-medium text-neutral-100">{word}</span>
                </div>
                <span className="shrink-0 font-mono text-xs text-neutral-500">{count}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
