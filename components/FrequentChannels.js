"use client";

import { useEffect, useState } from "react";
import { loadFrequent, removeFrequent } from "@/lib/frequentChannels";

export default function FrequentChannels({ onConnect, currentSlug }) {
  const [channels, setChannels] = useState([]);

  useEffect(() => {
    setChannels(loadFrequent());
  }, [currentSlug]); // refresh when channel changes

  if (channels.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[10px] uppercase tracking-wider text-neutral-600 shrink-0">Recientes</span>
      {channels.map((c) => (
        <div key={c.slug} className="group relative flex items-center">
          <button
            onClick={() => onConnect(c.slug)}
            disabled={c.slug === currentSlug}
            title={`${c.displayName} · ${c.count} sesión${c.count !== 1 ? "es" : ""}`}
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition ${
              c.slug === currentSlug
                ? "border-kick-green/40 bg-kick-green/10 text-kick-green cursor-default"
                : "border-kick-border bg-black/40 text-neutral-300 hover:border-kick-green/40 hover:text-neutral-100"
            }`}
          >
            {c.profilePic ? (
              <img src={c.profilePic} alt={c.displayName} className="h-4 w-4 rounded-full object-cover" />
            ) : (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-kick-green/20 text-[9px] font-bold text-kick-green">
                {c.displayName[0]?.toUpperCase()}
              </span>
            )}
            <span className="font-medium">{c.displayName}</span>
            {c.count > 1 && (
              <span className="text-[10px] text-neutral-500">{c.count}</span>
            )}
          </button>
          {/* Remove button on hover */}
          <button
            onClick={(e) => { e.stopPropagation(); removeFrequent(c.slug); setChannels(loadFrequent()); }}
            className="absolute -right-1 -top-1 hidden h-3.5 w-3.5 items-center justify-center rounded-full bg-neutral-700 text-[9px] text-neutral-300 group-hover:flex hover:bg-red-500/80 hover:text-white"
            title="Quitar de recientes"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
