"use client";

import { useEffect, useState } from "react";

export default function ConnectForm({ status, channelSlug, onConnect, onStop }) {
  const [value, setValue]         = useState(channelSlug ?? "");
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (channelSlug) setValue(channelSlug);
  }, [channelSlug]);

  // Cancel confirmation if user navigates away or status changes
  useEffect(() => {
    if (status !== "connected") setConfirming(false);
  }, [status]);

  const isBusy = status === "connecting";
  const isLive = status === "connected";

  const submit = (e) => {
    e.preventDefault();
    if (!value.trim() || isBusy || isLive) return;
    onConnect(value);
  };

  const handleStopClick = () => setConfirming(true);
  const handleConfirm   = () => { setConfirming(false); onStop(); };
  const handleCancel    = () => setConfirming(false);

  return (
    <div className="flex w-full flex-col gap-3 rounded-xl border border-kick-border bg-kick-panel p-4 sm:flex-row sm:items-center">
      <form
        onSubmit={submit}
        className="flex w-full flex-1 flex-col gap-3 sm:flex-row sm:items-center"
      >
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-kick-border bg-black/40 px-3 py-2 focus-within:border-kick-green/60">
          <span className="text-sm text-neutral-500">kick.com/</span>
          <input
            type="text"
            inputMode="text"
            autoComplete="off"
            spellCheck={false}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="nombre-del-canal"
            disabled={isLive || isBusy}
            className="flex-1 bg-transparent text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none disabled:opacity-50"
          />
        </div>

        {!isLive && (
          <button
            type="submit"
            disabled={!value.trim() || isBusy}
            className="inline-flex items-center justify-center rounded-lg bg-kick-green px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isBusy ? "Conectando…" : "Conectar"}
          </button>
        )}
      </form>

      {isLive && !confirming && (
        <button
          type="button"
          onClick={handleStopClick}
          className="inline-flex items-center justify-center rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/20"
        >
          Detener sesión
        </button>
      )}

      {isLive && confirming && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400">¿Detener sesión?</span>
          <button
            type="button"
            onClick={handleConfirm}
            className="inline-flex items-center justify-center rounded-lg bg-red-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
          >
            Sí, detener
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex items-center justify-center rounded-lg border border-kick-border bg-kick-panel px-3 py-2 text-sm text-neutral-300 transition hover:border-neutral-400"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}
