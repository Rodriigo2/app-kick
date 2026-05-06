"use client";

import { useState } from "react";

const KICKS_TABS = [
  { key: "lifetime", label: "All Time", icon: "🏆" },
  { key: "monthly",  label: "Mes",      icon: "📅" },
  { key: "weekly",   label: "Semana",   icon: "📆" },
  { key: "session",  label: "Sesión",   icon: "⚡" },
];

function fmtN(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const MEDAL = ["🥇", "🥈", "🥉"];

function LeaderList({ list, unit, emptyMsg }) {
  const top = list[0]?.quantity || 1;
  if (!list.length) return <p className="py-4 text-center text-sm text-neutral-500">{emptyMsg}</p>;

  return (
    <>
      {list.length >= 2 && (
        <div className={`grid gap-2 ${list.length >= 3 ? "grid-cols-3" : "grid-cols-2"}`}>
          {list.slice(0, Math.min(3, list.length)).map((d, i) => (
            <div key={d.user_id ?? i}
              className={`relative flex flex-col items-center gap-1 overflow-hidden rounded-xl border px-3 py-3 text-center ${
                i === 0 ? "border-yellow-400/40 bg-yellow-400/5" :
                i === 1 ? "border-neutral-400/40 bg-neutral-400/5" :
                          "border-amber-600/40 bg-amber-600/5"}`}>
              <span className="text-xl">{MEDAL[i]}</span>
              <span className="max-w-full truncate text-xs font-semibold text-neutral-100">{d.username}</span>
              <span className={`font-mono text-lg font-black ${
                i===0?"text-yellow-400":i===1?"text-neutral-300":"text-amber-600"}`}>
                {fmtN(d.quantity)}
                <span className="ml-1 text-[10px] font-normal text-neutral-500">{unit}</span>
              </span>
            </div>
          ))}
        </div>
      )}
      {list.length > 3 && (
        <div className="flex flex-col gap-1">
          {list.slice(3).map((d, i) => {
            const barPct = (d.quantity / top) * 100;
            return (
              <div key={d.user_id ?? i}
                className="relative flex items-center gap-3 overflow-hidden rounded-lg border border-kick-border/60 px-3 py-2 hover:bg-white/5">
                <div className="pointer-events-none absolute inset-y-0 left-0 bg-kick-green/10"
                  style={{ width: `${barPct}%` }} />
                <span className="relative w-5 shrink-0 text-center font-mono text-xs text-neutral-500">{i + 4}</span>
                <span className="relative flex-1 truncate text-sm font-medium text-neutral-100">{d.username}</span>
                <span className="relative font-mono text-sm font-semibold text-neutral-100">
                  {fmtN(d.quantity)} <span className="text-xs text-neutral-500">{unit}</span>
                </span>
              </div>
            );
          })}
        </div>
      )}
      <div className="flex justify-between border-t border-kick-border pt-2 text-xs text-neutral-500">
        <span>{list.length} donadores</span>
        <span>Total: <span className="font-mono text-neutral-300">{fmtN(list.reduce((s,d)=>s+d.quantity,0))} {unit}</span></span>
      </div>
    </>
  );
}

export default function TopDonors({ donors }) {
  const [kicksTab, setKicksTab] = useState("lifetime");
  const [section,  setSection]  = useState("subs"); // "subs" | "kicks"

  if (!donors) return null;

  const hasGifts = (donors.gifts ?? []).length > 0;
  const hasKicks = KICKS_TABS.some((t) => (donors[t.key] ?? []).length > 0);
  if (!hasGifts && !hasKicks) return null;

  const availKicksTabs = KICKS_TABS.filter((t) => (donors[t.key] ?? []).length > 0);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-kick-border bg-kick-panel p-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-neutral-100">Top Donadores</h2>
          <p className="text-xs text-neutral-500">Subs gifteados y Kicks del canal</p>
        </div>
        {/* Section switch */}
        <div className="flex overflow-hidden rounded-lg border border-kick-border">
          {hasGifts && (
            <button onClick={() => setSection("subs")}
              className={`px-3 py-1.5 text-xs transition ${section==="subs"?"bg-kick-green/20 text-kick-green":"text-neutral-400 hover:text-neutral-200"}`}>
              🎁 Subs
            </button>
          )}
          {hasKicks && (
            <button onClick={() => setSection("kicks")}
              className={`border-l border-kick-border px-3 py-1.5 text-xs transition ${section==="kicks"?"bg-kick-green/20 text-kick-green":"text-neutral-400 hover:text-neutral-200"}`}>
              ⚡ Kicks
            </button>
          )}
        </div>
      </div>

      {/* Subs section */}
      {section === "subs" && (
        <LeaderList list={donors.gifts ?? []} unit="subs" emptyMsg="Sin datos de subs gifteados" />
      )}

      {/* Kicks section */}
      {section === "kicks" && (
        <>
          {availKicksTabs.length > 1 && (
            <div className="flex gap-1">
              {availKicksTabs.map((t) => (
                <button key={t.key} onClick={() => setKicksTab(t.key)}
                  className={`rounded-lg border px-2.5 py-1 text-xs transition ${
                    kicksTab===t.key?"border-kick-green/60 bg-kick-green/10 text-kick-green":"border-kick-border text-neutral-400 hover:border-neutral-400"}`}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          )}
          <LeaderList list={donors[kicksTab] ?? []} unit="Kicks" emptyMsg="Sin datos de Kicks" />
        </>
      )}
    </div>
  );
}
