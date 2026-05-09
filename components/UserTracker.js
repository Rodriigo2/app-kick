"use client";

import { useEffect, useRef, useState } from "react";
import { getTrackedUserData, trackUser } from "@/lib/chatSession";
import { fmtTime } from "@/lib/formatters";
import MessageRenderer from "./MessageRenderer";

function scrollContainerToBottom(el) {
  if (el) el.scrollTop = el.scrollHeight;
}

export default function UserTracker({ username, emoteMap = {} }) {
  const [data, setData]       = useState(() => getTrackedUserData());
  const [profilePic, setProfilePic] = useState(null);
  const listRef               = useRef(null);
  const atBottomRef           = useRef(true);

  useEffect(() => {
    if (!username) { setProfilePic(null); return; }
    setProfilePic(null);
    fetch(`/api/channel/${encodeURIComponent(username)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.user?.profilePic) setProfilePic(d.user.profilePic); })
      .catch(() => {});
  }, [username]);

  useEffect(() => {
    const id = setInterval(() => setData(getTrackedUserData()), 1000);
    return () => clearInterval(id);
  }, []);

  const handleScroll = (e) => {
    const el = e.currentTarget;
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  };

  // Only snap when the user is already at the bottom.
  useEffect(() => {
    if (atBottomRef.current) scrollContainerToBottom(listRef.current);
  }, [data?.recentMsgs?.length]);

  if (!username || !data) return null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-kick-green/30 bg-kick-panel p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          {profilePic ? (
            <img src={profilePic} alt={data.username}
              className="h-10 w-10 rounded-full object-cover ring-2 ring-kick-green/40" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-kick-green/20 text-sm font-bold text-kick-green ring-2 ring-kick-green/20">
              {data.username[0]?.toUpperCase()}
            </div>
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-kick-green" />
              <span className="text-[10px] uppercase tracking-wider text-neutral-500">Siguiendo</span>
            </div>
            <span className="text-sm font-semibold text-kick-green">{data.username}</span>
          </div>
        </div>
        <button
          onClick={() => trackUser(null)}
          className="rounded-lg border border-kick-border px-2 py-1 text-xs text-neutral-400 hover:border-red-500/50 hover:text-red-400"
        >
          Dejar de seguir
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Rank",     value: data.rank ? `#${data.rank}` : "—" },
          { label: "Mensajes", value: data.count.toLocaleString() },
          { label: "% chat",   value: `${data.pct.toFixed(1)}%` },
          { label: "Msgs/min", value: data.msgsPerMin ? data.msgsPerMin.toFixed(1) : "—" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-kick-border bg-black/40 px-3 py-2 text-center">
            <div className="font-mono text-base font-bold text-neutral-100">{s.value}</div>
            <div className="text-[10px] uppercase tracking-wide text-neutral-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Top emote */}
      {data.topEmote && (
        <div className="flex items-center justify-between rounded-lg border border-kick-border bg-black/40 px-3 py-2">
          <span className="text-xs text-neutral-500 uppercase tracking-wide">Emote favorito</span>
          <div className="flex items-center gap-2">
            {data.topEmote.url && (
              <img src={data.topEmote.url} alt={data.topEmote.name} className="h-6 w-auto object-contain" />
            )}
            <span className="font-mono text-sm text-neutral-200">{data.topEmote.name}</span>
            <span className="text-xs text-neutral-500">×{data.topEmote.count}</span>
          </div>
        </div>
      )}

      {/* Recent messages feed */}
      <div>
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="uppercase tracking-wide text-neutral-500">Mensajes recientes</span>
          <span className="text-neutral-600">{data.recentMsgs.length.toLocaleString()} mensajes</span>
        </div>
        <div
          ref={listRef}
          onScroll={handleScroll}
          className="max-h-[50vh] overflow-y-auto rounded-lg border border-kick-border bg-black/40 p-2"
        >
          {data.recentMsgs.length === 0 ? (
            <p className="py-4 text-center text-xs text-neutral-600">Esperando mensajes…</p>
          ) : (
            <div className="flex flex-col gap-0.5">
              {data.recentMsgs.map((m, i) => (
                <div key={i} className="flex items-baseline gap-2 rounded px-2 py-0.5 text-sm hover:bg-white/5">
                  <span className="shrink-0 font-mono text-[10px] text-neutral-600">{fmtTime(m.ts)}</span>
                  <span className="min-w-0 break-words text-neutral-300">
                    <MessageRenderer content={m.content} emoteMap={emoteMap} />
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Timestamps */}
      <div className="flex justify-between font-mono text-[10px] text-neutral-600">
        <span>Primer msg: {fmtTime(data.firstSeen)}</span>
        <span>Último: {fmtTime(data.lastSeen)}</span>
      </div>
    </div>
  );
}
