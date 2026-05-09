"use client";

import { useEffect, useRef, useState } from "react";

const INTERVAL_MS = 10_000;
const MIN_MSGS    = 20;

// Convert :emoji_name: Discord format to Unicode emoji
const EMOJI_MAP = {
  smile:"😊", smiling_face:"😊", smiling_face_with_smiling_eyes:"😊",
  joy:"😂", laughing:"😂", rofl:"🤣", sob:"😭", cry:"😢",
  fire:"🔥", rage:"😡", angry:"😠", heart:"❤️", tada:"🎉",
  eyes:"👀", skull:"💀", clap:"👏", muscle:"💪", thinking:"🤔",
  face_with_raised_eyebrow:"🤨", unamused:"😒", neutral_face:"😐",
  slightly_smiling_face:"🙂", grinning:"😁", sweat_smile:"😅",
  face_screaming_in_fear:"😱", exploding_head:"🤯", star_struck:"🤩",
  sleeping:"😴", yawning_face:"🥱", pensive:"😔", confused:"😕",
  imp:"😈", sunglasses:"😎", smirk:"😏", zany_face:"🤪",
};

function resolveEmoji(raw) {
  if (!raw) return "💬";
  // Already a real emoji (non-ASCII)
  if (/\p{Emoji}/u.test(raw) && !/^:[a-z_]+:$/i.test(raw)) return raw;
  // :emoji_name: format
  const match = raw.match(/^:([a-z_]+):$/i);
  if (match) return EMOJI_MAP[match[1].toLowerCase()] ?? "💬";
  return raw;
}

function EmoteText({ text, emoteMap, activeEmotes = [] }) {
  if (!text) return null;

  // Solo reemplazar emotes que están siendo usados AHORA en el chat
  const activeNames = new Set(activeEmotes.map(e => e.name.toLowerCase()));
  const lookup = {};
  for (const [k, url] of Object.entries(emoteMap || {})) {
    if (activeNames.has(k.toLowerCase())) {
      lookup[k]               = { url, name: k };
      lookup[k.toLowerCase()] = { url, name: k };
    }
  }

  const tokens = text.split(/(\s+)/);

  return (
    <span>
      {tokens.map((token, i) => {
        if (/^\s+$/.test(token)) return <span key={i}>{token}</span>;

        // Strip trailing punctuation (but not quotes yet)
        const trailPunct = token.match(/[.,!?;]+$/)?.[0] ?? "";
        let word = trailPunct ? token.slice(0, -trailPunct.length) : token;

        // Strip surrounding quotes: 'emote', "emote"
        word = word.replace(/^['"](.+)['"]$/, "$1");

        // Strip surrounding colons: :emote:
        const colonMatch = word.match(/^:([^:]+):$/);
        if (colonMatch) word = colonMatch[1];

        // Strip single leading colon or quote
        if (word.startsWith(":") || word.startsWith("'") || word.startsWith('"')) word = word.slice(1);
        if (word.endsWith("'") || word.endsWith('"')) word = word.slice(0, -1);

        const emote = lookup[word] ?? lookup[word.toLowerCase()];
        if (emote) {
          return (
            <span key={i} className="inline-flex items-center">
              <img
                src={emote.url}
                alt={emote.name}
                title={emote.name}
                className="inline-block h-5 w-auto align-middle mx-0.5"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
              {trailPunct}
            </span>
          );
        }
        return <span key={i}>{token}</span>;
      })}
    </span>
  );
}


export default function ChatAI({ messages, channelInfo, emoteMap = {}, active = true }) {
  const [analysis,  setAnalysis]  = useState(null);
  const [emotes,    setEmotes]    = useState([]);
  const [status,    setStatus]    = useState("idle");
  const [error,     setError]     = useState(null);
  const [lastRun,   setLastRun]   = useState(null);
  const [iteration, setIteration] = useState(0);
  const memoryRef   = useRef(null);

  // Always-fresh refs — never cause re-renders, never go stale in closures
  const msgsRef    = useRef(messages);
  const infoRef    = useRef(channelInfo);
  const emoteRef   = useRef(emoteMap);
  msgsRef.current  = messages;
  infoRef.current  = channelInfo;
  emoteRef.current = emoteMap;
  const loadingRef = useRef(false);

  const activeRef = useRef(active);
  activeRef.current = active;

  const analyze = async () => {
    const msgs = msgsRef.current;
    if (!msgs?.length || msgs.length < MIN_MSGS || loadingRef.current || !activeRef.current) return;

    loadingRef.current = true;
    setStatus("loading");
    setError(null);

    try {
      const res = await fetch("/api/chat-ai", {
        method:  "POST",
        headers: { "content-type": "application/json" },
        body:    JSON.stringify({
          messages:    msgs.slice(-50),
          channelName: infoRef.current?.user?.username || infoRef.current?.slug || "",
          category:    infoRef.current?.streamCategory ?? null,
          streamTitle: infoRef.current?.streamTitle ?? null,
          emoteMap:    emoteRef.current,
          memory:      memoryRef.current,
        }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setStatus("error"); return; }
      setAnalysis(data.analysis);
      setEmotes((data.emotesDetected ?? []).slice(0, 20));
      setLastRun(Date.now());
      setIteration(n => n + 1);
      setStatus("done");

      if (data.analysis?.memory) memoryRef.current = data.analysis.memory;
    } catch (e) {
      setError(e?.message ?? "Error desconocido");
      setStatus("error");
    } finally {
      loadingRef.current = false;
    }
  };

  // Interval — completely independent from render cycle
  useEffect(() => {
    // First analysis when we have enough messages
    const checkFirst = setInterval(() => {
      if (msgsRef.current?.length >= MIN_MSGS) {
        clearInterval(checkFirst);
        analyze();
      }
    }, 2000);

    // Periodic refresh
    const refresh = setInterval(analyze, INTERVAL_MS);

    return () => { clearInterval(checkFirst); clearInterval(refresh); };
  }, []); // eslint-disable-line

  const isLoading = status === "loading";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-kick-border bg-kick-panel p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">IA del chat</span>
            <span className="rounded-full bg-purple-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-purple-400">
              Ollama · qwen2.5
            </span>
          </div>
          <p className="mt-0.5 text-[10px] text-neutral-600">
            {isLoading ? "Analizando…" :
             lastRun   ? `Hace ${Math.round((Date.now() - lastRun) / 1000)}s · ${iteration} análisis` :
             "Esperando mensajes…"}
          </p>
        </div>
        <button onClick={analyze} disabled={isLoading}
          className="rounded-lg border border-kick-border bg-black/40 px-3 py-1.5 text-xs text-neutral-400 transition hover:border-purple-500/40 hover:text-purple-300 disabled:opacity-40">
          {isLoading
            ? <span className="flex items-center gap-1.5"><span className="h-2 w-2 animate-spin rounded-full border border-purple-400 border-t-transparent" />Analizando</span>
            : "↻ Analizar"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>
      )}

      {isLoading && !analysis && (
        <div className="flex flex-col gap-2">
          {[80,65,90].map((w,i) => (
            <div key={i} className="h-3 animate-pulse rounded bg-white/5" style={{ width:`${w}%` }} />
          ))}
        </div>
      )}

      {analysis && (
        <>
          {/* Mood */}
          <div className="flex items-center gap-2">
            <span className="text-2xl leading-none">{resolveEmoji(analysis.mood_icon)}</span>
            <span className="text-sm font-semibold capitalize text-neutral-100">{analysis.mood}</span>
            {analysis.irony && (
              <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[10px] text-purple-300">
                😏 irónico
              </span>
            )}
          </div>


          {/* Descripción con emotes inline — solo los detectados en el chat actual */}
          <div className="rounded-lg border border-kick-green/20 bg-kick-green/5 px-3 py-2.5 text-xs leading-relaxed text-neutral-200">
            <EmoteText text={analysis.description} emoteMap={emoteMap} activeEmotes={emotes} />
          </div>

          {analysis.irony && analysis.irony_note && (
            <p className="text-[11px] italic text-purple-400/80">{analysis.irony_note}</p>
          )}

          {analysis.topics?.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-neutral-600">
              {analysis.topics.map((t, i) => (
                <span key={i}>{t}{i < analysis.topics.length - 1 ? " ·" : ""}</span>
              ))}
            </div>
          )}
        </>
      )}

      {status === "idle" && (
        <p className="text-xs text-neutral-600">Necesito {MIN_MSGS} mensajes para analizar.</p>
      )}
    </div>
  );
}
