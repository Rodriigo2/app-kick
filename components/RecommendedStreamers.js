"use client";

import { useEffect, useState } from "react";

function fmtViewers(n) {
  if (!n) return null;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

export default function RecommendedStreamers({ category = null, excludeSlug = null, onConnect }) {
  const [streamers, setStreamers] = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category)    params.set("category", category);
    if (excludeSlug) params.set("exclude",  excludeSlug);

    fetch(`/api/recommended?${params}`)
      .then((r) => r.ok ? r.json() : { streamers: [] })
      .then(({ streamers }) => setStreamers(streamers ?? []))
      .catch(() => setStreamers([]))
      .finally(() => setLoading(false));
  }, [category, excludeSlug]);

  if (loading) return (
    <div className="flex flex-col gap-3">
      <SectionHeader category={category} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl border border-kick-border bg-kick-panel" />
        ))}
      </div>
    </div>
  );

  if (!streamers.length) return (
    <div className="flex flex-col gap-2">
      <SectionHeader category={category} />
      <p className="text-xs text-neutral-600">No se pudieron cargar streamers en este momento.</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      <SectionHeader category={category} count={streamers.length} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {streamers.map((s) => (
          <button key={s.slug} onClick={() => onConnect?.(s.slug)}
            className="group relative flex flex-col overflow-hidden rounded-xl border border-kick-border bg-kick-panel transition hover:border-kick-green/40 focus:outline-none">
            {/* Thumbnail */}
            <div className="relative h-20 w-full overflow-hidden bg-black/60">
              {s.thumbnail ? (
                <img src={s.thumbnail} alt={s.title ?? s.username}
                  className="h-full w-full object-cover opacity-80 transition group-hover:opacity-100" />
              ) : (
                <div className="flex h-full items-center justify-center text-2xl text-neutral-700">📺</div>
              )}
              {/* Live badge */}
              <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-red-500 px-1.5 py-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
                <span className="text-[9px] font-bold text-white">LIVE</span>
              </div>
              {/* Viewers */}
              {s.viewers != null && (
                <div className="absolute right-2 top-2 rounded-full bg-black/70 px-1.5 py-0.5 text-[9px] font-mono text-neutral-200">
                  👁 {fmtViewers(s.viewers)}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex items-center gap-2 px-2.5 py-2">
              {s.profilePic ? (
                <img src={s.profilePic} alt={s.username}
                  className="h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-kick-border" />
              ) : (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-kick-green/20 text-xs font-bold text-kick-green">
                  {s.username?.[0]?.toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="truncate text-xs font-semibold text-neutral-100 group-hover:text-kick-green transition">
                  {s.username}
                </div>
                {s.category && (
                  <div className="truncate text-[10px] text-neutral-500">{s.category}</div>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function SectionHeader({ category, count }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm font-semibold text-neutral-300">
          {category ? `En vivo en ${category}` : "Streamers en vivo"}
        </div>
        <p className="text-[10px] text-neutral-500">Hacé click para conectarte</p>
      </div>
      {count > 0 && (
        <span className="flex items-center gap-1 text-[10px] text-neutral-600">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
          {count} en vivo
        </span>
      )}
    </div>
  );
}
