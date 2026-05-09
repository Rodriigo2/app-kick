"use client";

import { useEffect, useState } from "react";

export default function PollDisplay({ poll }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!poll) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [poll]);

  if (!poll) return null;

  const totalVotes = poll.options.reduce((s, o) => s + (o.votes ?? 0), 0);
  const maxVotes   = Math.max(...poll.options.map((o) => o.votes ?? 0), 1);
  const winner     = poll.options.reduce((a, b) => (b.votes ?? 0) > (a.votes ?? 0) ? b : a, poll.options[0]);

  const elapsed  = Math.floor((now - poll.createdAt) / 1000);
  const remaining = poll.remaining != null ? Math.max(0, poll.remaining - elapsed) : null;
  const isEnded  = remaining !== null && remaining === 0;

  return (
    <div className={`flex flex-col gap-3 rounded-xl border p-4 ${isEnded ? "border-neutral-600 bg-neutral-900/50" : "border-kick-green/30 bg-kick-green/5"}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {!isEnded && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-kick-green" />}
          <h2 className="text-sm font-semibold text-neutral-100">
            {isEnded ? "Encuesta finalizada" : "Encuesta activa"}
          </h2>
        </div>
        <div className="flex items-center gap-3 text-xs text-neutral-500">
          <span>{totalVotes.toLocaleString()} votos</span>
          {remaining !== null && (
            <span className={`font-mono ${isEnded ? "text-neutral-600" : "text-kick-green"}`}>
              {isEnded ? "Finalizada" : `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`}
            </span>
          )}
        </div>
      </div>

      {/* Question */}
      <p className="font-medium text-neutral-100">{poll.title}</p>

      {/* Options */}
      <div className="flex flex-col gap-2">
        {poll.options.map((opt) => {
          const pct      = totalVotes > 0 ? ((opt.votes ?? 0) / totalVotes) * 100 : 0;
          const barPct   = ((opt.votes ?? 0) / maxVotes) * 100;
          const isWinner = opt.id === winner?.id && (opt.votes ?? 0) > 0;

          return (
            <div key={opt.id} className="relative overflow-hidden rounded-lg border border-kick-border bg-black/40">
              {/* Background bar */}
              <div
                className={`pointer-events-none absolute inset-y-0 left-0 transition-all duration-700 ${isWinner ? "bg-kick-green/20" : "bg-white/5"}`}
                style={{ width: `${barPct}%` }}
              />
              <div className="relative flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-2">
                  {isWinner && <span className="text-xs text-kick-green">▶</span>}
                  <span className={`text-sm ${isWinner ? "font-semibold text-neutral-100" : "text-neutral-300"}`}>
                    {opt.label}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-mono text-sm font-semibold ${isWinner ? "text-kick-green" : "text-neutral-400"}`}>
                    {pct.toFixed(1)}%
                  </span>
                  <span className="font-mono text-xs text-neutral-600">
                    {(opt.votes ?? 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
