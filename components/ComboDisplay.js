"use client";

import { useEffect, useState } from "react";

export default function ComboDisplay({ combo }) {
  const [visible, setVisible] = useState(false);
  const [prev, setPrev]       = useState(null);

  useEffect(() => {
    if (combo) {
      setVisible(true);
      setPrev(combo);
    } else {
      // Linger 2 seconds after combo ends
      const t = setTimeout(() => setVisible(false), 2000);
      return () => clearTimeout(t);
    }
  }, [combo]);

  const display = combo || prev;
  if (!visible || !display) return null;

  // Size grows with count: 3→small, 10→medium, 20+→large
  const size  = display.count >= 20 ? "text-5xl" : display.count >= 10 ? "text-4xl" : "text-3xl";
  const glow  = display.count >= 20 ? "shadow-[0_0_30px_#53fc1840]" : display.count >= 10 ? "shadow-[0_0_16px_#53fc1830]" : "";

  return (
    <div className={`flex items-center gap-4 rounded-xl border border-kick-green/30 bg-kick-green/5 px-5 py-4 transition-all ${glow} ${!combo ? "opacity-50" : "opacity-100"}`}>
      {/* Emote */}
      <div className="flex shrink-0 items-center justify-center">
        {display.url ? (
          <img src={display.url} alt={display.name} className="h-14 w-auto object-contain" />
        ) : (
          <span className="text-4xl">🎯</span>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className={`font-black tabular-nums text-kick-green ${size}`}>
            ×{display.count}
          </span>
          <span className="truncate font-mono text-sm text-neutral-300">{display.name}</span>
        </div>
        <p className="text-xs text-neutral-500">
          {display.count >= 20 ? "¡Combo épico! 🔥🔥🔥" : display.count >= 10 ? "¡Combo! 🔥🔥" : "Combo 🔥"}
        </p>
      </div>

      {/* Animated bar */}
      <div className="h-10 w-1.5 overflow-hidden rounded-full bg-white/5">
        <div
          className="w-full rounded-full bg-kick-green transition-all duration-300"
          style={{ height: `${Math.min(100, (display.count / 25) * 100)}%`, marginTop: "auto" }}
        />
      </div>
    </div>
  );
}
