"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import MessageRenderer from "./MessageRenderer";
import BadgeList from "./BadgeList";

export default function ChatFeed({ messages, emoteMap = {}, subscriberBadges = [] }) {
  const containerRef = useRef(null);
  const atBottomRef  = useRef(true);
  const [showJump, setShowJump] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const [filter, setFilter]     = useState("");

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter(
      (m) =>
        m.username.toLowerCase().includes(q) ||
        (m.content ?? "").toLowerCase().includes(q)
    );
  }, [messages, filter]);

  const isFiltering = filter.trim().length > 0;

  const scrollToBottom = () => {
    const el = containerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    atBottomRef.current = true;
    setShowJump(false);
    setNewCount(0);
  };

  const handleScroll = (e) => {
    const el = e.currentTarget;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (dist < 120) { atBottomRef.current = true; setShowJump(false); setNewCount(0); }
    else atBottomRef.current = false;
  };

  useEffect(() => {
    if (isFiltering) return; // don't auto-scroll while filtering
    const el = containerRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (dist < 120) {
      el.scrollTop = el.scrollHeight;
      setShowJump(false);
      setNewCount(0);
    } else {
      setNewCount((n) => n + 1);
      setShowJump(true);
    }
  }, [messages, isFiltering]);

  useEffect(() => { scrollToBottom(); }, []); // eslint-disable-line

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-kick-border bg-kick-panel p-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="shrink-0 text-sm font-semibold text-neutral-100">Chat en vivo</h2>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className={`flex flex-1 items-center gap-1.5 rounded-lg border bg-black/40 px-2.5 py-1 ${filter ? "border-kick-green/50" : "border-kick-border"}`}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0 text-neutral-500">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filtrar por usuario o mensaje…"
              className="w-full bg-transparent text-xs text-neutral-100 placeholder:text-neutral-600 focus:outline-none"
            />
            {filter && (
              <button onClick={() => setFilter("")} className="shrink-0 text-neutral-500 hover:text-neutral-200">
                ×
              </button>
            )}
          </div>
          {isFiltering && (
            <span className="shrink-0 text-[11px] text-neutral-500">
              {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
            </span>
          )}
          {!isFiltering && (
            <span className="shrink-0 text-xs text-neutral-500">
              {Object.keys(emoteMap).length} emotes
            </span>
          )}
        </div>
      </div>

      {/* Feed */}
      <div className="relative">
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="flex max-h-[60vh] flex-col gap-0.5 overflow-y-auto rounded-lg border border-kick-border bg-black/40 p-2"
          style={{ overscrollBehaviorY: "contain", overflowAnchor: "none" }}
        >
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-neutral-600">
              {isFiltering ? `Sin resultados para "${filter}"` : "Esperando mensajes…"}
            </p>
          ) : (
            filtered.map((m) => (
              <div
                key={m.id}
                className={`rounded px-2 py-0.5 text-sm leading-snug hover:bg-white/5 ${
                  isFiltering && m.username.toLowerCase().includes(filter.toLowerCase())
                    ? "border-l-2 border-kick-green/50 pl-1.5"
                    : ""
                }`}
              >
                <BadgeList badges={m.badges ?? []} subscriberBadges={subscriberBadges} />
                <span className="font-semibold" style={{ color: /^#[0-9a-f]{3,6}$/i.test(m.color) ? m.color : "#53fc18" }}>
                  {m.username}:{" "}
                </span>
                <span className="break-words text-neutral-300">
                  <MessageRenderer content={m.content} emoteMap={emoteMap} />
                </span>
              </div>
            ))
          )}
        </div>

        {!isFiltering && showJump && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full border border-kick-border bg-kick-panel px-3 py-1 text-xs text-neutral-200 shadow-lg hover:border-kick-green/50 hover:text-kick-green"
          >
            ↓ {newCount} nuevo{newCount !== 1 ? "s" : ""}
          </button>
        )}
      </div>
    </div>
  );
}
