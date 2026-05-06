"use client";

import { useEffect, useRef, useState } from "react";
import Pusher from "pusher-js";
import MessageRenderer from "@/components/MessageRenderer";
import BadgeList from "@/components/BadgeList";

const KICK_PUSHER_KEY     = "32cbd69e4b950bf97679";
const KICK_PUSHER_CLUSTER = "us2";
const MAX_MESSAGES        = 30;

function useLiveChat(chatroomId) {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (!chatroomId) return;
    const pusher  = new Pusher(KICK_PUSHER_KEY, { cluster: KICK_PUSHER_CLUSTER, forceTLS: true });
    const channel = pusher.subscribe(`chatrooms.${chatroomId}.v2`);

    const handler = (raw) => {
      try {
        const p        = typeof raw === "string" ? JSON.parse(raw) : raw || {};
        const username = p?.sender?.username || p?.sender?.slug;
        const color    = p?.sender?.identity?.color || "#53fc18";
        const badges   = p?.sender?.identity?.badges ?? [];
        const content  = p?.content ?? p?.message?.content ?? "";
        const id       = p?.id ?? String(Date.now() + Math.random());
        if (!username) return;
        setMessages((prev) => {
          const next = [...prev, { id, username, color, badges, content }];
          return next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next;
        });
      } catch {}
    };

    channel.bind("App\\Events\\ChatMessageSentEvent", handler);
    channel.bind("App\\Events\\ChatMessageEvent",     handler);

    return () => {
      try { channel.unbind_all(); pusher.unsubscribe(channel.name); pusher.disconnect(); } catch {}
    };
  }, [chatroomId]);

  return messages;
}

function useEmotes(kickUserId, slug) {
  const [emoteMap, setEmoteMap] = useState(null);
  const [ready,    setReady]    = useState(false);

  useEffect(() => {
    if (!kickUserId && !slug) { setEmoteMap({}); setReady(true); return; }
    const params = new URLSearchParams();
    if (kickUserId) params.set("kickUserId", kickUserId);
    if (slug)       params.set("slug", slug);
    fetch(`/api/emotes?${params}`)
      .then((r) => r.json())
      .then((d) => { setEmoteMap(d?.emotes ?? {}); setReady(true); })
      .catch(() => { setEmoteMap({}); setReady(true); });
  }, [kickUserId, slug]);

  return { emoteMap: emoteMap ?? {}, ready };
}

export default function OverlayPage() {
  const [chatroomId,       setChatroomId]       = useState(null);
  const [kickUserId,       setKickUserId]        = useState(null);
  const [slug,             setSlug]              = useState("");
  const [subscriberBadges, setSubscriberBadges]  = useState([]);
  const [loading,          setLoading]           = useState(false);
  const [err,              setErr]               = useState(null);

  const { emoteMap, ready } = useEmotes(kickUserId, slug);
  const messages  = useLiveChat(chatroomId);
  const bottomRef = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ch  = params.get("channel") || params.get("chatroom");
    const cid = params.get("cid");
    const sl  = params.get("slug");
    if (!ch) return;
    if (/^\d+$/.test(ch)) {
      setChatroomId(Number(ch));
      setKickUserId(cid ? Number(cid) : Number(ch));
      if (sl) {
        setSlug(sl);
        // Fetch channel info to get subscriber badges
        fetch(`/api/channel/${encodeURIComponent(sl)}`)
          .then((r) => r.json())
          .then((d) => { if (d?.subscriberBadges) setSubscriberBadges(d.subscriberBadges); })
          .catch(() => {});
      }
    } else {
      setSlug(ch);
      resolveSlug(ch);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function resolveSlug(s) {
    setLoading(true); setErr(null);
    try {
      const res  = await fetch(`/api/channel/${encodeURIComponent(s.trim().toLowerCase())}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
      setChatroomId(body.chatroomId);
      setKickUserId(body.kickUserId ?? body.chatroomId);
      setSlug(body.slug ?? s);
      if (body.subscriberBadges) setSubscriberBadges(body.subscriberBadges);
    } catch (e) { setErr(e.message); }
    finally     { setLoading(false); }
  }

  // The overlay is a fixed window — always snap to the latest message instantly.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "instant" });
  }, [messages]);

  // ── Setup screen ──────────────────────────────────────────────────────────
  if (!chatroomId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black/80 p-8">
        <div className="w-full max-w-sm rounded-2xl border border-kick-border bg-kick-panel p-6">
          <h1 className="mb-1 text-lg font-semibold text-neutral-100">Chat Overlay</h1>
          <p className="mb-4 text-xs text-neutral-500">
            Pegá la URL en OBS como browser source (fondo transparente).
          </p>
          <form onSubmit={(e) => { e.preventDefault(); resolveSlug(slug); }} className="flex flex-col gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-kick-border bg-black/40 px-3 py-2 focus-within:border-kick-green/60">
              <span className="text-sm text-neutral-500">kick.com/</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="nombre-del-canal"
                className="flex-1 bg-transparent text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none"
              />
            </div>
            {err && <p className="text-xs text-red-400">{err}</p>}
            <button type="submit" disabled={!slug.trim() || loading}
              className="rounded-lg bg-kick-green py-2 text-sm font-semibold text-black disabled:opacity-50">
              {loading ? "Conectando…" : "Iniciar overlay"}
            </button>
          </form>
          <p className="mt-4 text-[11px] text-neutral-600">
            URL directa: <code className="text-neutral-400">/overlay?channel=xqc</code>
          </p>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex h-screen items-end justify-start p-4" style={{ background: "transparent" }}>
        <div className="rounded px-2 py-1 text-xs text-white/40" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.9)" }}>
          Cargando emotes…
        </div>
      </div>
    );
  }

  // ── Live overlay ──────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen flex-col justify-end overflow-hidden p-4" style={{ background: "transparent" }}>
      <div className="flex flex-col gap-0.5" style={{ maxWidth: "100%" }}>
        {messages.map((m, i) => (
          <div
            key={m.id}
            className="rounded px-2 py-0.5 text-[15px] leading-snug"
            style={{
              opacity: 0.6 + 0.4 * (i / Math.max(messages.length - 1, 1)),
              textShadow: "0 1px 4px rgba(0,0,0,0.9)",
            }}
          >
            <BadgeList badges={m.badges} subscriberBadges={subscriberBadges} />
            <span className="font-bold" style={{ color: /^#[0-9a-f]{3,6}$/i.test(m.color) ? m.color : "#53fc18" }}>{m.username}:{" "}</span>
            <span className="break-words text-white">
              <MessageRenderer content={m.content} emoteMap={emoteMap} />
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
