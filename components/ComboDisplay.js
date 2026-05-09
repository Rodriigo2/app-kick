"use client";

import { useEffect, useRef, useState } from "react";

export default function ComboDisplay({ combo }) {
  const [display,  setDisplay]  = useState(null);
  const [visible,  setVisible]  = useState(false);
  const [bounce,   setBounce]   = useState(false);
  const [dying,    setDying]    = useState(false);
  const prevCount  = useRef(0);
  const fadeTimer  = useRef(null);

  useEffect(() => {
    if (combo && !combo.dying) {
      // New or updated combo
      setDisplay(combo);
      setVisible(true);
      setDying(false);
      clearTimeout(fadeTimer.current);

      // Trigger bounce animation on count increase
      if (combo.count !== prevCount.current) {
        prevCount.current = combo.count;
        setBounce(true);
        setTimeout(() => setBounce(false), 350);
      }
    } else if (combo?.dying || !combo) {
      // Combo broken — freeze and fade out
      setDying(true);
      clearTimeout(fadeTimer.current);
      fadeTimer.current = setTimeout(() => {
        setVisible(false);
        setDying(false);
        setDisplay(null);
        prevCount.current = 0;
      }, 3000);
    }
  }, [combo]);

  if (!visible || !display) return null;

  const count = display.count;
  const size  = count >= 50 ? "text-6xl" : count >= 20 ? "text-5xl" : count >= 10 ? "text-4xl" : "text-3xl";
  const color = count >= 50 ? "#ef4444" : count >= 20 ? "#f97316" : "#53fc18";
  const label = count >= 50 ? "¡COMBO ÉPICO! 🔥🔥🔥" : count >= 20 ? "¡Combo épico! 🔥🔥" : count >= 10 ? "¡Combo! 🔥" : "Combo";

  return (
    <div className={`flex items-center gap-4 rounded-xl border bg-black/80 px-5 py-4 backdrop-blur-sm transition-all duration-500 ${
      dying ? "opacity-30 scale-90" : "opacity-100 scale-100"
    }`}
      style={{ borderColor: `${color}40`, boxShadow: dying ? "none" : `0 0 20px ${color}20` }}
    >
      {/* Emote image */}
      <div className="shrink-0">
        {display.url ? (
          <img src={display.url} alt={display.name}
            className={`object-contain transition-transform duration-150 ${bounce ? "scale-125" : "scale-100"}`}
            style={{ height: count >= 20 ? "64px" : "48px", width: "auto" }}
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        ) : (
          <span className={`text-4xl transition-transform duration-150 ${bounce ? "scale-125" : "scale-100"}`}>🎯</span>
        )}
      </div>

      {/* Counter */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span
            className={`font-black tabular-nums leading-none transition-all duration-150 ${size} ${bounce ? "scale-110" : "scale-100"}`}
            style={{
              color,
              display: "inline-block",
              textShadow: bounce ? `0 0 20px ${color}` : "none",
              transform: bounce ? "scale(1.15)" : "scale(1)",
            }}
          >
            ×{count}
          </span>
          <span className="truncate font-mono text-sm text-neutral-400">{display.name}</span>
        </div>
        <p className="text-xs text-neutral-500 mt-0.5">{dying ? "Combo terminado" : label}</p>
      </div>

      {/* Pulse bar */}
      {!dying && (
        <div className="h-12 w-1.5 overflow-hidden rounded-full bg-white/5">
          <div
            className="w-full rounded-full transition-all duration-300"
            style={{
              height: `${Math.min(100, (count / 30) * 100)}%`,
              background: color,
              marginTop: "auto",
            }}
          />
        </div>
      )}
    </div>
  );
}
