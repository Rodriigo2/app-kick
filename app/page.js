"use client";

import { useEffect, useRef, useState } from "react";
import ConnectForm      from "@/components/ConnectForm";
import StatsBar         from "@/components/StatsBar";
import BackfillBar      from "@/components/BackfillBar";
import ActivityChart    from "@/components/ActivityChart";
import ChatFeed         from "@/components/ChatFeed";
import RankingTable     from "@/components/RankingTable";
import EmoteRanking     from "@/components/EmoteRanking";
import CategoryTimeline from "@/components/CategoryTimeline";
import UserTracker      from "@/components/UserTracker";
import ComboDisplay     from "@/components/ComboDisplay";
import SessionSummary   from "@/components/SessionSummary";
import SessionHistory   from "@/components/SessionHistory";
import SubCounter      from "@/components/SubCounter";
import TopDonors       from "@/components/TopDonors";
import { useKickChat }  from "@/hooks/useKickChat";

const LIVE_POLL_MS = 30_000; // check every 30s if stream is still live

export default function HomePage() {
  const {
    status, error, channelInfo, stats, backfill,
    ranking, emoteRanking, timeSeries, peaks, titleChanges,
    categoryHistory, categoryStats, activeCombo, lastSummary, donors,
    subCount, giftCount, subEvents,
    peakUsers, quietMoment,
    messages, emoteMap, trackedUsername,
    connect, stop, exportXLSX, trackUser, refreshChannelInfo,
  } = useKickChat();

  const [analyticsOpen,  setAnalyticsOpen]  = useState(true);
  const [showSummary,    setShowSummary]    = useState(false);
  const [liveWarning,    setLiveWarning]    = useState(null);

  // Show summary modal automatically when session is stopped
  useEffect(() => {
    if (status === "stopped" && lastSummary) setShowSummary(true);
  }, [status, lastSummary]);

  // Auto-stop + auto-refresh channel info (category, title, viewers, tags).
  // Requires 2 consecutive "not live" results to avoid false positives.
  const offlineCountRef = useRef(0);
  useEffect(() => {
    if (status !== "connected" || !channelInfo?.slug) return;
    offlineCountRef.current = 0;
    const slug = channelInfo.slug;
    const id = setInterval(async () => {
      try {
        const res  = await fetch(`/api/channel/${encodeURIComponent(slug)}?fresh=1`);
        const data = await res.json();
        if (res.ok) {
          if (data?.isLive === false) {
            offlineCountRef.current += 1;
            if (offlineCountRef.current >= 1) stop();
          } else {
            offlineCountRef.current = 0;
            // Refresh category, title, viewers and tags automatically
            refreshChannelInfo();
          }
        } else {
          offlineCountRef.current = 0;
        }
      } catch {
        offlineCountRef.current = 0;
      }
    }, LIVE_POLL_MS);
    return () => clearInterval(id);
  }, [status, channelInfo?.slug, stop, refreshChannelInfo]);

  const handleConnect = async (slug) => {
    setLiveWarning(null);
    // Pre-check if the channel is live before connecting
    try {
      const res  = await fetch(`/api/channel/${encodeURIComponent(slug.trim().toLowerCase())}?fresh=1`);
      const data = await res.json();
      if (res.ok && data?.isLive === false) {
        setLiveWarning(slug.trim().toLowerCase());
        return; // block connection
      }
    } catch {}
    connect(slug);
  };

  const isActive     = status === "connected" || status === "stopped";
  const canExport    = ranking.length > 0;
  const hasAnalytics = timeSeries.length > 1 || emoteRanking.length > 0 || categoryHistory?.length > 0;

  const overlayUrl = channelInfo?.chatroomId
    ? `/overlay?channel=${encodeURIComponent(channelInfo.chatroomId)}&cid=${encodeURIComponent(channelInfo.kickUserId ?? channelInfo.chatroomId)}&slug=${encodeURIComponent(channelInfo.slug ?? "")}`
    : null;

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6">

      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-kick-green font-black text-black">C</div>
          <div>
            <h1 className="text-base font-semibold text-neutral-100">ChatStats</h1>
            <p className="text-xs text-neutral-500">Kick.com — estadísticas en tiempo real</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SessionHistory />
          {overlayUrl && (
            <>
              <a href={overlayUrl} target="_blank" rel="noopener noreferrer"
                className="rounded-lg border border-kick-border bg-kick-panel px-3 py-1.5 text-xs text-neutral-300 transition hover:border-kick-green/50 hover:text-kick-green">
                Overlay Chat
              </a>
              <a href={`/overlay/ranking?channel=${channelInfo?.chatroomId}`} target="_blank" rel="noopener noreferrer"
                className="rounded-lg border border-kick-border bg-kick-panel px-3 py-1.5 text-xs text-neutral-300 transition hover:border-kick-green/50 hover:text-kick-green">
                Overlay Ranking
              </a>
            </>
          )}
          <button onClick={exportXLSX} disabled={!canExport}
            className="rounded-lg border border-kick-border bg-kick-panel px-3 py-1.5 text-xs text-neutral-300 transition hover:border-kick-green/50 disabled:cursor-not-allowed disabled:opacity-40">
            Exportar XLS
          </button>
        </div>
      </header>

      <ConnectForm status={status} channelSlug={channelInfo?.slug ?? ""} onConnect={handleConnect} onStop={stop} />

      {/* Offline warning */}
      {liveWarning && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-yellow-400">El canal no está en vivo</p>
            <p className="text-xs text-yellow-400/70">
              <span className="font-mono">{liveWarning}</span> no está transmitiendo ahora mismo.
            </p>
          </div>
          <button
            onClick={() => { setLiveWarning(null); connect(liveWarning); }}
            className="shrink-0 rounded-lg border border-yellow-500/40 px-3 py-1.5 text-xs text-yellow-400 hover:bg-yellow-500/10"
          >
            Conectar de todas formas
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      {isActive && (
        <>
          {/* ── 1. Info del canal ─────────────────────────────── */}
          <StatsBar status={status} channelInfo={channelInfo} stats={stats}
            titleChanges={titleChanges} categoryHistory={categoryHistory} onRefresh={refreshChannelInfo} />
          <BackfillBar backfill={backfill} liveStartedAt={channelInfo?.liveStartedAt ?? null} />

          {/* ── 2. Alertas contextuales ───────────────────────── */}
          <ComboDisplay combo={activeCombo} />
          {trackedUsername && <UserTracker username={trackedUsername} emoteMap={emoteMap} />}

          {/* ── 3. Contenido principal: chat + ranking ────────── */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <ChatFeed messages={messages} emoteMap={emoteMap}
              subscriberBadges={channelInfo?.subscriberBadges ?? []} />
            <RankingTable ranking={ranking} totalMessages={stats.totalMessages}
              emoteMap={emoteMap} trackedUsername={trackedUsername} onTrack={trackUser} />
          </div>

          {/* ── 4. Análisis (colapsable) ──────────────────────── */}
          {hasAnalytics && (
            <div className="flex flex-col gap-4">
              <button onClick={() => setAnalyticsOpen((v) => !v)}
                className="flex items-center gap-2 text-xs text-neutral-500 hover:text-neutral-300">
                <span className={`transition-transform ${analyticsOpen ? "rotate-90" : ""}`}>▶</span>
                <span className="uppercase tracking-widest">Análisis</span>
                <span className="flex-1 border-t border-kick-border/40" />
              </button>

              {analyticsOpen && (
                <div className="flex flex-col gap-4">
                  {/* Gráfico de actividad + Top emotes lado a lado */}
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {timeSeries.length > 1 && (
                      <ActivityChart timeSeries={timeSeries} peaks={peaks}
                        peakUsers={peakUsers} quietMoment={quietMoment} />
                    )}
                    {emoteRanking.length > 0 && (
                      <EmoteRanking emoteRanking={emoteRanking} totalMessages={stats.totalMessages} />
                    )}
                  </div>

                  {/* Tiempo por categoría */}
                  {categoryHistory?.length > 0 && (
                    <CategoryTimeline categoryHistory={categoryHistory}
                      categoryStats={categoryStats} sessionStart={stats.startedAt} />
                  )}

                  {/* Top donadores */}
                  {donors && <TopDonors donors={donors} />}

                  {/* Contador de subs */}
                  <SubCounter subCount={subCount} giftCount={giftCount} subEvents={subEvents} />
                </div>
              )}
            </div>
          )}
        </>
      )}

      {!isActive && ranking.length > 0 && (
        <RankingTable ranking={ranking} totalMessages={stats.totalMessages} emoteMap={emoteMap} />
      )}

      {!isActive && ranking.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-kick-panel text-2xl">📊</div>
          <p className="text-sm text-neutral-400">
            Ingresá el nombre de un canal en vivo y conectate para monitorear el chat.
          </p>
        </div>
      )}

      {/* Session summary modal */}
      {showSummary && lastSummary && (
        <SessionSummary summary={lastSummary} onClose={() => setShowSummary(false)} />
      )}

    </main>
  );
}
