"use client";

import { useState } from "react";
import { fmtTime } from "@/lib/formatters";
import MessageRenderer from "./MessageRenderer";

const STATUS_DOT = {
  idle:       "bg-neutral-500",
  connecting: "bg-yellow-400 animate-pulse",
  connected:  "bg-kick-green animate-pulse",
  error:      "bg-red-500",
};

function ChannelHeader({ channelInfo, stats, status, onDisconnect }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-kick-border bg-kick-panel px-4 py-3">
      <div className="flex items-center gap-3">
        {channelInfo?.user?.profilePic && (
          <img src={channelInfo.user.profilePic} alt="" className="h-8 w-8 rounded-full object-cover" />
        )}
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-neutral-100">
              {channelInfo?.user?.username || channelInfo?.slug || "—"}
            </span>
            <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status] ?? STATUS_DOT.idle}`} />
          </div>
          <div className="flex gap-3 text-xs text-neutral-500">
            <span>{stats.totalMessages.toLocaleString()} msgs</span>
            <span>{stats.uniqueUsers} usuarios</span>
          </div>
        </div>
      </div>
      <button onClick={onDisconnect}
        className="rounded-lg border border-kick-border px-2 py-1 text-xs text-neutral-400 hover:border-red-500/50 hover:text-red-400">
        Quitar
      </button>
    </div>
  );
}

function ChatMini({ messages, emoteMap = {} }) {
  return (
    <div className="flex max-h-48 flex-col gap-0.5 overflow-y-auto rounded-lg border border-kick-border bg-black/40 p-2">
      {messages.length === 0
        ? <p className="py-4 text-center text-xs text-neutral-600">Esperando mensajes…</p>
        : messages.map((m) => (
          <div key={m.id} className="text-xs leading-snug hover:bg-white/5 rounded px-1.5 py-0.5">
            <span className="font-semibold" style={{ color: m.color || "#53fc18" }}>{m.username}: </span>
            <span className="break-words text-neutral-300">
              <MessageRenderer content={m.content} emoteMap={emoteMap} />
            </span>
          </div>
        ))}
    </div>
  );
}

function ComparisonTable({ primary, secondary }) {
  if (!primary.ranking.length && !secondary.ranking.length) return null;

  // Build merged table
  const map1  = new Map(primary.ranking.map((u) => [u.username, u.count]));
  const map2  = new Map(secondary.ranking.map((u) => [u.username, u.count]));
  const names = [...new Set([...map1.keys(), ...map2.keys()])];

  const rows = names
    .map((u) => ({ username: u, c1: map1.get(u) ?? 0, c2: map2.get(u) ?? 0 }))
    .sort((a, b) => (b.c1 + b.c2) - (a.c1 + a.c2))
    .slice(0, 20);

  const maxC1 = Math.max(...rows.map((r) => r.c1), 1);
  const maxC2 = Math.max(...rows.map((r) => r.c2), 1);

  const ch1 = primary.channelInfo?.user?.username  || "Canal 1";
  const ch2 = secondary.channelInfo?.user?.username || "Canal 2";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-kick-border bg-kick-panel p-4">
      <h2 className="text-sm font-semibold text-neutral-100">Comparación de viewers</h2>
      <div className="overflow-hidden rounded-lg border border-kick-border">
        <div className="grid grid-cols-[1fr_120px_120px] border-b border-kick-border bg-black/40 px-3 py-2 text-[11px] uppercase tracking-wider text-neutral-500">
          <div>Usuario</div>
          <div className="text-right">{ch1}</div>
          <div className="text-right">{ch2}</div>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {rows.map((r) => {
            const inBoth = r.c1 > 0 && r.c2 > 0;
            return (
              <div key={r.username}
                className={`grid grid-cols-[1fr_120px_120px] items-center border-b border-kick-border/60 px-3 py-2 text-sm last:border-b-0 hover:bg-white/5 ${inBoth ? "bg-kick-green/5" : ""}`}>
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium text-neutral-100">{r.username}</span>
                  {inBoth && <span className="shrink-0 rounded-full bg-kick-green/20 px-1.5 text-[10px] text-kick-green">ambos</span>}
                </div>
                {/* Bar + count ch1 */}
                <div className="relative flex items-center justify-end gap-2 pr-1">
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full rounded-full bg-blue-500/60" style={{ width: `${(r.c1/maxC1)*100}%` }} />
                  </div>
                  <span className="w-8 text-right font-mono text-neutral-300">{r.c1 || "—"}</span>
                </div>
                {/* Bar + count ch2 */}
                <div className="relative flex items-center justify-end gap-2 pr-1">
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full rounded-full bg-kick-green/60" style={{ width: `${(r.c2/maxC2)*100}%` }} />
                  </div>
                  <span className="w-8 text-right font-mono text-neutral-300">{r.c2 || "—"}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* Shared viewers count */}
      {(() => {
        const shared = rows.filter((r) => r.c1 > 0 && r.c2 > 0).length;
        return shared > 0 ? (
          <p className="text-xs text-neutral-500">
            <span className="font-semibold text-kick-green">{shared}</span> viewer{shared !== 1 ? "s" : ""} activo{shared !== 1 ? "s" : ""} en ambos canales
          </p>
        ) : null;
      })()}
    </div>
  );
}

export default function CompareView({ primary, emoteMap, onClose, secondary, onConnectSecondary, onDisconnectSecondary }) {
  const [input, setInput] = useState("");

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-kick-green/20 bg-kick-panel/50 p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-neutral-100">Modo comparación</h2>
        <button onClick={onClose} className="text-xs text-neutral-500 hover:text-neutral-200">Cerrar ×</button>
      </div>

      {/* Two columns: primary + secondary */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Primary channel */}
        <div className="flex flex-col gap-2">
          <ChannelHeader channelInfo={primary.channelInfo} stats={primary.stats}
            status={primary.status} onDisconnect={() => {}} />
          <ChatMini messages={primary.messages} emoteMap={emoteMap} />
        </div>

        {/* Secondary channel */}
        <div className="flex flex-col gap-2">
          {secondary.status === "idle" ? (
            <form onSubmit={(e) => { e.preventDefault(); if (input.trim()) onConnectSecondary(input); }}
              className="flex gap-2">
              <div className="flex flex-1 items-center gap-2 rounded-lg border border-kick-border bg-black/40 px-3 py-2 focus-within:border-kick-green/60">
                <span className="text-xs text-neutral-500">kick.com/</span>
                <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
                  placeholder="segundo canal" autoComplete="off"
                  className="flex-1 bg-transparent text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none" />
              </div>
              <button type="submit" disabled={!input.trim()}
                className="rounded-lg bg-kick-green px-3 py-2 text-sm font-semibold text-black disabled:opacity-50">
                Añadir
              </button>
            </form>
          ) : (
            <>
              <ChannelHeader channelInfo={secondary.channelInfo} stats={secondary.stats}
                status={secondary.status} onDisconnect={onDisconnectSecondary} />
              {secondary.error && (
                <p className="text-xs text-red-400">{secondary.error}</p>
              )}
              {secondary.status === "connected" && (
                <ChatMini messages={secondary.messages} emoteMap={emoteMap} />
              )}
            </>
          )}
        </div>
      </div>

      {/* Comparison table */}
      {secondary.status === "connected" && (
        <ComparisonTable primary={primary} secondary={secondary} />
      )}
    </div>
  );
}
