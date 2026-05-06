"use client";

import { useEffect, useState } from "react";

const THUMB_REFRESH_MS = 30_000;

export default function StreamPreview({ channelInfo, onClose }) {
  const [thumbTs, setThumbTs] = useState(() => Date.now());
  const [loaded,  setLoaded]  = useState(false);
  const [error,   setError]   = useState(false);

  const slug      = channelInfo?.slug;
  const thumbBase = channelInfo?.streamThumbnail;
  const thumb     = thumbBase ? `${thumbBase}?t=${thumbTs}` : null;

  // Auto-refresh thumbnail every 30s
  useEffect(() => {
    setLoaded(false);
    setError(false);
    const id = setInterval(() => {
      setThumbTs(Date.now());
      setLoaded(false);
    }, THUMB_REFRESH_MS);
    return () => clearInterval(id);
  }, [thumbBase]);

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-kick-border bg-kick-panel p-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
          <span className="text-xs font-semibold text-neutral-200">Preview en vivo</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setThumbTs(Date.now()); setLoaded(false); }}
            title="Actualizar preview"
            className="text-xs text-neutral-500 hover:text-neutral-200"
          >
            ↻ Actualizar
          </button>
          <a
            href={`https://kick.com/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-neutral-500 hover:text-kick-green"
          >
            Abrir en Kick ↗
          </a>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-200">×</button>
        </div>
      </div>

      {/* Preview */}
      <div className="relative overflow-hidden rounded-lg bg-black" style={{ aspectRatio: "16/9" }}>
        {thumb && !error ? (
          <>
            {!loaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-kick-green border-t-transparent" />
              </div>
            )}
            <img
              key={thumbTs}
              src={thumb}
              alt="Stream preview"
              className={`h-full w-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
              onLoad={() => setLoaded(true)}
              onError={() => setError(true)}
            />
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-neutral-600">
            <span className="text-3xl">📺</span>
            <span className="text-xs">Preview no disponible</span>
            {slug && (
              <a href={`https://kick.com/${slug}`} target="_blank" rel="noopener noreferrer"
                className="text-xs text-kick-green hover:underline">
                Ver en Kick ↗
              </a>
            )}
          </div>
        )}

        {/* Live badge */}
        <div className="absolute left-2 top-2 flex items-center gap-1 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
          EN VIVO
        </div>

        {/* Refresh timer */}
        {loaded && (
          <div className="absolute bottom-1.5 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[9px] text-white/50">
            actualiza cada 30s
          </div>
        )}
      </div>
    </div>
  );
}
