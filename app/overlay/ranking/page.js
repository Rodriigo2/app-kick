"use client";

import { useEffect, useState } from "react";

const TOP_N = 10;

function useRankingBroadcast() {
  const [ranking, setRanking] = useState([]);
  const [total,   setTotal]   = useState(0);
  const [channel, setChannel] = useState("");
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const bc = new BroadcastChannel("chatstats_ranking");

    bc.onmessage = (e) => {
      if (e.data?.type === "ranking") {
        setRanking(e.data.ranking?.slice(0, TOP_N) ?? []);
        setTotal(e.data.total ?? 0);
        setChannel(e.data.channel ?? "");
        setConnected(true);
      }
    };

    // Request current data from the main tab on mount
    bc.postMessage({ type: "request" });

    // Retry request every 3s until we get data
    const retry = setInterval(() => {
      bc.postMessage({ type: "request" });
    }, 3000);

    return () => { bc.close(); clearInterval(retry); };
  }, []);

  return { ranking, total, channel, connected };
}

export default function RankingOverlayPage() {
  const { ranking, total, channel, connected } = useRankingBroadcast();

  const top1Count = ranking[0]?.count || 1;

  if (!connected) {
    return (
      <div className="flex h-screen items-end justify-start p-4" style={{ background: "transparent" }}>
        <div className="rounded-lg px-3 py-2 text-xs text-white/40"
          style={{ background: "rgba(0,0,0,0.6)", textShadow: "0 1px 4px rgba(0,0,0,0.9)" }}>
          Esperando datos de la sesión… (abrí el dashboard primero)
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col justify-end overflow-hidden p-4"
      style={{ background: "transparent" }}>
      <div className="flex flex-col gap-1.5" style={{ maxWidth: 380 }}>

        {/* Header */}
        <div className="mb-1 flex items-center justify-between px-1">
          <span className="font-bold text-white" style={{ textShadow: "0 1px 6px rgba(0,0,0,0.9)" }}>
            Top Viewers {channel && <span className="text-white/50">· {channel}</span>}
          </span>
          <span className="font-mono text-xs text-white/40">{total.toLocaleString()} msgs</span>
        </div>

        {ranking.length === 0 ? (
          <div className="rounded-lg px-3 py-2 text-xs text-white/50"
            style={{ background: "rgba(0,0,0,0.6)" }}>
            Sin datos aún
          </div>
        ) : (
          ranking.map((u, i) => {
            const barPct = (u.count / top1Count) * 100;
            const pct    = total > 0 ? ((u.count / total) * 100).toFixed(1) : "0";
            return (
              <div key={u.username}
                className="relative flex items-center gap-2 overflow-hidden rounded-lg px-3 py-1.5"
                style={{
                  background: "rgba(0,0,0,0.65)",
                  backdropFilter: "blur(4px)",
                  textShadow: "0 1px 4px rgba(0,0,0,0.9)",
                  opacity: 0.7 + 0.3 * (1 - i / TOP_N),
                }}>
                {/* Bar */}
                <div className="pointer-events-none absolute inset-y-0 left-0 rounded-lg"
                  style={{ width: `${barPct}%`, background: "rgba(83,252,24,0.15)" }} />

                {/* Rank */}
                <span className={`relative shrink-0 w-5 text-center font-mono text-sm font-bold ${
                  i===0?"text-yellow-400":i===1?"text-neutral-300":i===2?"text-amber-600":"text-white/60"
                }`}>{i + 1}</span>

                {/* Username */}
                <span className="relative flex-1 truncate text-sm font-semibold text-white">
                  {u.username}
                </span>

                {/* Streak */}
                {(u.streak ?? 0) >= 3 && (
                  <span className="relative shrink-0 rounded-full bg-orange-500/30 px-1.5 text-[10px] font-bold text-orange-400">
                    🔥{u.streak}
                  </span>
                )}

                {/* Count + % */}
                <div className="relative flex items-center gap-2 text-right">
                  <span className="font-mono text-sm font-bold text-kick-green">{u.count}</span>
                  <span className="font-mono text-[10px] text-white/40">{pct}%</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
