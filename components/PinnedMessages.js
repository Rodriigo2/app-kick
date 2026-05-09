"use client";

import { useState } from "react";
import { fmtTime } from "@/lib/formatters";
import MessageRenderer from "./MessageRenderer";



export default function PinnedMessages({ pinnedMessages = [], emoteMap = {} }) {
  const [expanded, setExpanded] = useState(false);

  if (!pinnedMessages.length) return null;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-yellow-500/30 bg-kick-panel p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm">📌</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-yellow-400">
            Mensajes anclados
          </span>
          <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 font-mono text-[10px] text-yellow-400">
            {pinnedMessages.length}
          </span>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="rounded-lg border border-kick-border px-3 py-1 text-xs text-neutral-400 hover:border-yellow-500/40 hover:text-yellow-400"
        >
          {expanded ? "Ocultar" : "Ver todos"}
        </button>
      </div>

      {/* Latest pin always visible */}
      {!expanded && (
        <PinRow msg={pinnedMessages[pinnedMessages.length - 1]} emoteMap={emoteMap} />
      )}

      {/* All pins when expanded */}
      {expanded && (
        <div className="flex flex-col gap-1.5">
          {[...pinnedMessages].reverse().map((msg) => (
            <PinRow key={msg.id} msg={msg} emoteMap={emoteMap} />
          ))}
        </div>
      )}
    </div>
  );
}

function PinRow({ msg, emoteMap }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-kick-border/60 bg-black/40 px-3 py-2">
      <span className="shrink-0 font-mono text-[10px] text-neutral-600 pt-0.5">{fmtTime(msg.ts)}</span>
      <div className="min-w-0 flex-1">
        <span className="mr-1.5 text-xs font-semibold text-yellow-400">{msg.username}</span>
        <span className="break-words text-sm text-neutral-200">
          <MessageRenderer content={msg.content} emoteMap={emoteMap} />
        </span>
      </div>
    </div>
  );
}
