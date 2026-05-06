"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Pusher from "pusher-js";

const KICK_PUSHER_KEY     = "32cbd69e4b950bf97679";
const KICK_PUSHER_CLUSTER = "us2";
const FLUSH_MS            = 2000;

const EMPTY = {
  status:      "idle",
  channelInfo: null,
  stats:       { totalMessages: 0, uniqueUsers: 0 },
  ranking:     [],
  messages:    [],
  error:       null,
};

export function useSecondaryChannel() {
  const [state, setState] = useState(EMPTY);

  const pusherRef  = useRef(null);
  const channelRef = useRef(null);
  const mapRef     = useRef(new Map()); // username → count
  const totalRef   = useRef(0);
  const tickRef    = useRef(null);
  const msgRef     = useRef([]);

  const flush = useCallback(() => {
    const arr = Array.from(mapRef.current.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50)
      .map(([username, count]) => ({ username, count }));
    setState((prev) => ({
      ...prev,
      stats:   { totalMessages: totalRef.current, uniqueUsers: mapRef.current.size },
      ranking: arr,
      messages: msgRef.current.slice(-200),
    }));
  }, []);

  const cleanup = useCallback(() => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    if (channelRef.current) { try { channelRef.current.unbind_all(); } catch {} }
    if (pusherRef.current) {
      try { if (channelRef.current) pusherRef.current.unsubscribe(channelRef.current.name); } catch {}
      try { pusherRef.current.connection.unbind_all(); } catch {}
      try { pusherRef.current.disconnect(); } catch {}
    }
    channelRef.current = null;
    pusherRef.current  = null;
  }, []);

  const connect = useCallback(async (input) => {
    const raw = (input || "").trim().toLowerCase();
    if (!raw) return;

    cleanup();
    mapRef.current   = new Map();
    totalRef.current = 0;
    msgRef.current   = [];
    setState({ ...EMPTY, status: "connecting" });

    let info;
    try {
      const res  = await fetch(`/api/channel/${encodeURIComponent(raw)}?fresh=1`);
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
      if (!body.isLive) throw new Error(`${raw} no está en vivo`);
      info = body;
    } catch (err) {
      setState({ ...EMPTY, error: err.message }); return;
    }

    setState((prev) => ({ ...prev, channelInfo: info }));

    const pusher  = new Pusher(KICK_PUSHER_KEY, { cluster: KICK_PUSHER_CLUSTER, forceTLS: true });
    pusherRef.current = pusher;

    const ch = pusher.subscribe(`chatrooms.${info.chatroomId}.v2`);
    channelRef.current = ch;

    ch.bind("pusher:subscription_succeeded", () => {
      setState((prev) => ({ ...prev, status: "connected" }));
      tickRef.current = setInterval(flush, FLUSH_MS);
    });

    ch.bind("pusher:subscription_error", (err) => {
      setState({ ...EMPTY, error: `Error al suscribir (${err?.status ?? "?"})` });
    });

    const handler = (raw) => {
      try {
        const p  = typeof raw === "string" ? JSON.parse(raw) : raw || {};
        const u  = p?.sender?.username || p?.sender?.slug;
        const c  = p?.content ?? p?.message?.content ?? "";
        if (!u) return;
        mapRef.current.set(u, (mapRef.current.get(u) ?? 0) + 1);
        totalRef.current += 1;
        const color = p?.sender?.identity?.color || null;
        msgRef.current = [...msgRef.current.slice(-199), { id: String(Date.now()+Math.random()), username: u, color, content: c }];
      } catch {}
    };

    ch.bind("App\\Events\\ChatMessageSentEvent", handler);
    ch.bind("App\\Events\\ChatMessageEvent",     handler);
  }, [cleanup, flush]);

  const disconnect = useCallback(() => {
    cleanup();
    mapRef.current   = new Map();
    totalRef.current = 0;
    msgRef.current   = [];
    setState(EMPTY);
  }, [cleanup, flush]);

  useEffect(() => () => cleanup(), [cleanup]);

  return { ...state, connect, disconnect };
}
