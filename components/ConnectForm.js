"use client";

import { useEffect, useState } from "react";

export default function ConnectForm({ status, channelSlug, onConnect, onStop }) {
  const [value,      setValue]      = useState(channelSlug ?? "");
  const [confirming, setConfirming] = useState(false);

  useEffect(() => { if (channelSlug) setValue(channelSlug); }, [channelSlug]);
  useEffect(() => { if (status !== "connected") setConfirming(false); }, [status]);

  const isBusy    = status === "connecting";
  const isLive    = status === "connected";
  const isWaiting = status === "waiting";
  const isActive  = isLive || isBusy || isWaiting;

  const submit = (e) => {
    e.preventDefault();
    if (!value.trim() || isActive) return;
    onConnect(value);
  };

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      {/* Input */}
      <div className={`flex flex-1 items-center gap-1.5 rounded-lg border bg-black/40 px-3 py-2 transition ${
        isActive ? "border-kick-border opacity-60" : "border-kick-border focus-within:border-kick-green/50"
      }`}>
        <span className="select-none text-xs text-neutral-600">kick.com/</span>
        <input
          type="text" inputMode="text" autoComplete="off" spellCheck={false}
          value={value} onChange={(e) => setValue(e.target.value)}
          placeholder="nombre-del-canal"
          disabled={isActive}
          className="flex-1 bg-transparent text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none"
        />
        {/* Live indicator inside input */}
        {isLive && (
          <span className="flex items-center gap-1 text-[10px] text-kick-green">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-kick-green" />
            LIVE
          </span>
        )}
        {isBusy && <span className="text-[10px] text-yellow-400 animate-pulse">Conectando…</span>}
        {isWaiting && <span className="text-[10px] text-blue-400 animate-pulse">Esperando…</span>}
      </div>

      {/* Connect / Stop button */}
      {!isLive && !confirming && (
        <button type="submit" disabled={!value.trim() || isBusy || isWaiting}
          className="rounded-lg bg-kick-green px-4 py-2 text-sm font-bold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40">
          Conectar
        </button>
      )}
      {isLive && !confirming && (
        <button type="button" onClick={() => setConfirming(true)}
          className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/20">
          Detener
        </button>
      )}
      {isLive && confirming && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-neutral-400">¿Seguro?</span>
          <button type="button" onClick={() => { setConfirming(false); onStop(); }}
            className="rounded-lg bg-red-500 px-3 py-2 text-xs font-bold text-white hover:bg-red-600">Sí</button>
          <button type="button" onClick={() => setConfirming(false)}
            className="rounded-lg border border-kick-border px-3 py-2 text-xs text-neutral-400 hover:text-neutral-200">No</button>
        </div>
      )}
    </form>
  );
}
