"use client";

import { useEffect, useRef, useState } from "react";
import ConnectForm      from "@/components/ConnectForm";
import StatsBar         from "@/components/StatsBar";
import BackfillBar      from "@/components/BackfillBar";
import ActivityChart    from "@/components/ActivityChart";
import ChatFeed         from "@/components/ChatFeed";
import RankingTable     from "@/components/RankingTable";
import EmoteRanking     from "@/components/EmoteRanking";
import EmoteByHour      from "@/components/EmoteByHour";
import CategoryTimeline from "@/components/CategoryTimeline";
import LurkerStats      from "@/components/LurkerStats";
import TopDonors        from "@/components/TopDonors";
import SubCounter       from "@/components/SubCounter";
import UserTracker      from "@/components/UserTracker";
import ComboDisplay     from "@/components/ComboDisplay";
import SessionSummary   from "@/components/SessionSummary";
import SessionHistory      from "@/components/SessionHistory";
import FrequentChannels   from "@/components/FrequentChannels";
import PollDisplay      from "@/components/PollDisplay";
import PredictionDisplay from "@/components/PredictionDisplay";
import PinnedMessages   from "@/components/PinnedMessages";
import CommandStats     from "@/components/CommandStats";
import ChatAI           from "@/components/ChatAI";
import ChatterStats     from "@/components/ChatterStats";
import UserModal        from "@/components/UserModal";
import ActiveMods       from "@/components/ActiveMods";
import ToastContainer   from "@/components/ToastContainer";
import { useKickChat }  from "@/hooks/useKickChat";
import { startWaiting } from "@/lib/chatSession";
import { getPriority, setPriority, clearPriority } from "@/lib/priorityStreamer";
import { loadSessions } from "@/lib/sessionHistory";
import { loadFrequent } from "@/lib/frequentChannels";
import { addToast }     from "@/lib/toasts";

const LIVE_POLL_MS = 30_000;
const WAIT_POLL_MS = 10_000;

const ANALYTICS_TABS = [
  { key: "activity",    label: "Actividad",   icon: "📊" },
  { key: "emotes",      label: "Emotes",      icon: "😄" },
  { key: "categories",  label: "Categorías",  icon: "🎮" },
  { key: "donations",   label: "Donaciones",  icon: "🎁" },
  { key: "mods",        label: "Mods",        icon: "🛡️" },
];

function EmptyState({ onConnect }) {
  const [channels, setChannels] = useState([]);
  useEffect(() => { setChannels(loadFrequent()); }, []);

  return (
    <div className="flex flex-col items-center gap-8 py-12">
      {channels.length > 0 ? (
        <>
          <div className="text-center">
            <div className="mb-1 text-sm font-semibold text-neutral-300">Canales recientes</div>
            <p className="text-xs text-neutral-500">Hacé click para conectarte</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {channels.map((c) => (
              <button key={c.slug} onClick={() => onConnect(c.slug)}
                className="group flex flex-col items-center gap-3 rounded-xl border border-kick-border bg-kick-panel p-5 transition hover:border-kick-green/40 hover:bg-kick-green/5 focus:outline-none">
                {c.profilePic ? (
                  <img src={c.profilePic} alt={c.displayName}
                    className="h-14 w-14 rounded-full object-cover ring-2 ring-kick-border group-hover:ring-kick-green/40 transition" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-kick-green/20 text-xl font-bold text-kick-green">
                    {c.displayName[0]?.toUpperCase()}
                  </div>
                )}
                <div className="text-center">
                  <div className="text-sm font-semibold text-neutral-100 group-hover:text-kick-green transition">{c.displayName}</div>
                  <div className="text-[10px] text-neutral-500">{c.count} sesión{c.count !== 1 ? "es" : ""}</div>
                </div>
              </button>
            ))}
          </div>
          <p className="text-xs text-neutral-600">O escribí un canal en el input de arriba</p>
        </>
      ) : (
        <>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-kick-panel text-2xl">📊</div>
          <p className="text-sm text-neutral-400">Ingresá el nombre de un canal y conectate para monitorear el chat.</p>
        </>
      )}
    </div>
  );
}

function LastLiveInfo({ slug }) {
  const sessions = typeof window !== "undefined" ? loadSessions() : [];
  const last     = sessions.find((s) => s.slug === slug);
  if (!last) return null;
  const d = new Date(last.stoppedAt);
  return (
    <p className="text-xs text-neutral-500">
      Última vez en vivo:{" "}
      <span className="text-neutral-300">
        {d.toLocaleDateString([], { day:"2-digit", month:"short" })} a las{" "}
        {d.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}
      </span>
      {" · "}
      <span className="font-mono">{last.totalMessages.toLocaleString()} msgs</span>
    </p>
  );
}

export default function HomePage() {
  const {
    status, error, channelInfo, stats, backfill,
    ranking, emoteRanking, emoteByHour, timeSeries, peaks,
    titleChanges, categoryHistory, categoryStats, lurkerStats,
    activePoll, activePrediction, activeCombo, lastSummary, donors,
    subCount, giftCount, subEvents, pinnedMessages, retentionData, activeMods, peakViewerCount, topCommands, kickEmoteMap,
    peakUsers, quietMoment,
    messages, emoteMap, trackedUsername,
    connect, stop, cancelWaiting, exportXLSX, trackUser, refreshChannelInfo,
  } = useKickChat();

  const [showSummary,     setShowSummary]    = useState(false);
  const [selectedUser,    setSelectedUser]   = useState(null); // { user, rank }
  const [liveWarning,     setLiveWarning]    = useState(null);
  const [priority,        setPriorityState]  = useState(null);
  const [priorityInput,   setPriorityInput]  = useState(false);
  const [analyticsTab,    setAnalyticsTab]   = useState("activity");
  const [confirmNewSession, setConfirmNewSession] = useState(false);

  useEffect(() => { setPriorityState(getPriority()); }, []);
  useEffect(() => {
    if (status === "stopped" && lastSummary) setShowSummary(true);
  }, [status, lastSummary]);

  // Priority streamer polling
  const offlinePriorityRef = useRef(0);
  useEffect(() => {
    if (!priority || status !== "connected") return;
    if (channelInfo?.slug === priority) return;
    const id = setInterval(async () => {
      try {
        const res  = await fetch(`/api/channel/${encodeURIComponent(priority)}?fresh=1`);
        const data = await res.json();
        if (res.ok && data?.isLive === true) { stop(); await new Promise(r => setTimeout(r, 800)); connect(priority); }
      } catch {}
    }, LIVE_POLL_MS);
    return () => clearInterval(id);
  }, [priority, status, channelInfo?.slug, stop, connect]);

  // Waiting mode polling
  useEffect(() => {
    if (status !== "waiting" || !channelInfo?.slug) return;
    const id = setInterval(async () => {
      try {
        const res  = await fetch(`/api/channel/${encodeURIComponent(channelInfo.slug)}?fresh=1`);
        const data = await res.json();
        if (res.ok && data?.isLive === true) connect(channelInfo.slug);
      } catch {}
    }, WAIT_POLL_MS);
    return () => clearInterval(id);
  }, [status, channelInfo?.slug, connect]);

  // Auto-stop when stream ends
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
            refreshChannelInfo();
          }
        } else offlineCountRef.current = 0;
      } catch { offlineCountRef.current = 0; }
    }, LIVE_POLL_MS);
    return () => clearInterval(id);
  }, [status, channelInfo?.slug, stop, refreshChannelInfo]);

  // ── Toast triggers ──────────────────────────────────────────────────────
  const prevGiftCountRef = useRef(0);
  useEffect(() => {
    const prev = prevGiftCountRef.current;
    if (giftCount > prev) {
      const added = giftCount - prev;
      if (added >= 10) {
        addToast({ type: "gift-bomb", icon: "🎁", title: `¡Gift bomb! +${added} subs`, message: "Lluvia de subs en el chat", duration: 6000 });
      }
      prevGiftCountRef.current = giftCount;
    }
  }, [giftCount]);

  const handleConnect = async (slug) => {
    setLiveWarning(null);
    const clean = slug.trim().toLowerCase();
    try {
      const res  = await fetch(`/api/channel/${encodeURIComponent(clean)}?fresh=1`);
      const data = await res.json();
      if (res.ok && data?.isLive === false) { startWaiting(data); return; }
    } catch {}
    connect(slug);
  };

  const isActive   = status === "connected" || status === "stopped";
  const isWaiting  = status === "waiting";
  const canExport  = ranking.length > 0;
  const overlayUrl = channelInfo?.chatroomId
    ? `/overlay?channel=${encodeURIComponent(channelInfo.chatroomId)}&cid=${encodeURIComponent(channelInfo.kickUserId ?? channelInfo.chatroomId)}&slug=${encodeURIComponent(channelInfo.slug ?? "")}`
    : null;

  const hasActivity   = timeSeries.length > 1;
  const hasEmotes     = emoteRanking.length > 0 || emoteByHour?.length > 0;
  const hasCategories = categoryHistory?.length > 0;
  const hasDonations  = donors || (subCount + giftCount) > 0;
  const hasAnalytics  = hasActivity || hasEmotes || hasCategories || hasDonations || lurkerStats;

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4">

      {/* ── Header ─────────────────────────────────────────── */}
      <header className="flex items-center justify-between gap-3">
        {/* Logo */}
        <div className="flex shrink-0 items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-kick-green font-black text-black">C</div>
          <div className="hidden sm:block">
            <h1 className="text-base font-semibold text-neutral-100">ChatStats</h1>
            <p className="text-xs text-neutral-500">Kick.com</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">

          {/* ── Priority streamer ── */}
          {priority ? (
            <div className="flex items-center gap-1.5 rounded-lg border border-yellow-400/30 bg-yellow-400/10 px-2.5 py-1.5 text-xs">
              <span className="text-yellow-400">⚡</span>
              <span className="font-medium text-yellow-400">{priority}</span>
              <button onClick={() => { clearPriority(); setPriorityState(null); }} title="Quitar prioritario"
                className="text-yellow-400/50 hover:text-yellow-400">×</button>
            </div>
          ) : priorityInput ? (
            <form onSubmit={(e) => { e.preventDefault(); const v = e.target.slug.value.trim().toLowerCase(); if (v) { setPriority(v); setPriorityState(v); } setPriorityInput(false); }}
              className="flex items-center gap-1">
              <div className="flex items-center gap-1 rounded-lg border border-yellow-400/30 bg-black/40 px-2 py-1.5 focus-within:border-yellow-400/60">
                <span className="text-[10px] text-yellow-400/60">⚡</span>
                <input name="slug" autoFocus placeholder="canal prioritario"
                  className="w-24 bg-transparent text-xs text-neutral-100 placeholder:text-neutral-600 focus:outline-none" />
              </div>
              <button type="submit" className="rounded-lg bg-yellow-400/20 px-2 py-1.5 text-[10px] text-yellow-400 hover:bg-yellow-400/30">OK</button>
              <button type="button" onClick={() => setPriorityInput(false)} className="text-neutral-500 hover:text-neutral-300">×</button>
            </form>
          ) : (
            <button onClick={() => setPriorityInput(true)} title="Setear canal prioritario"
              className="rounded-lg border border-kick-border bg-kick-panel p-2 text-neutral-500 transition hover:border-yellow-400/40 hover:text-yellow-400">
              ⚡
            </button>
          )}

          {/* ── Divider ── */}
          <div className="h-5 w-px bg-kick-border" />

          {/* ── OBS overlays (icon buttons) ── */}
          {overlayUrl && (
            <div className="flex items-center gap-1">
              <a href={overlayUrl} target="_blank" rel="noopener noreferrer"
                title="Overlay Chat para OBS"
                className="rounded-lg border border-kick-border bg-kick-panel px-2.5 py-1.5 text-xs text-neutral-400 transition hover:border-kick-green/40 hover:text-kick-green">
                Chat
                <span className="ml-1 text-[9px] text-neutral-600">OBS</span>
              </a>
              <a href={`/overlay/ranking?channel=${channelInfo?.chatroomId}`} target="_blank" rel="noopener noreferrer"
                title="Overlay Ranking para OBS"
                className="rounded-lg border border-kick-border bg-kick-panel px-2.5 py-1.5 text-xs text-neutral-400 transition hover:border-kick-green/40 hover:text-kick-green">
                Ranking
                <span className="ml-1 text-[9px] text-neutral-600">OBS</span>
              </a>
            </div>
          )}

          {/* ── Historial ── */}
          <SessionHistory />

          {/* ── Divider ── */}
          {canExport && <div className="h-5 w-px bg-kick-border" />}

          {/* ── Export ── */}
          {canExport && (
            <div className="flex items-center gap-1">
              <button onClick={exportXLSX}
                title="Exportar datos a Excel"
                className="rounded-lg border border-kick-border bg-kick-panel px-3 py-1.5 text-xs text-neutral-300 transition hover:border-kick-green/50 hover:text-kick-green">
                ↓ XLS
              </button>
              <button
                onClick={async () => {
                  const { exportSessionImage } = await import("@/lib/exportImage");
                  exportSessionImage({ channelInfo, stats, ranking, emoteRanking, lurkerStats, subCount, giftCount, peaks, timeSeries, peakViewerCount });
                }}
                title="Exportar resumen como imagen"
                className="rounded-lg border border-kick-border bg-kick-panel px-3 py-1.5 text-xs text-neutral-300 transition hover:border-kick-green/50 hover:text-kick-green">
                ↓ IMG
              </button>
            </div>
          )}

          {/* ── Nueva sesión ── */}
          {isActive && !confirmNewSession && (
            <>
              <div className="h-5 w-px bg-kick-border" />
              <button onClick={() => setConfirmNewSession(true)}
                title="Detener sesión actual y volver al inicio"
                className="rounded-lg border border-kick-border bg-kick-panel px-3 py-1.5 text-xs text-neutral-400 transition hover:border-neutral-500 hover:text-neutral-200">
                Nueva sesión
              </button>
            </>
          )}
          {isActive && confirmNewSession && (
            <div className="flex items-center gap-2 rounded-lg border border-orange-500/40 bg-orange-500/10 px-3 py-1.5 text-xs">
              <span className="text-orange-400">¿Detener sesión actual?</span>
              <button onClick={() => { stop(); setConfirmNewSession(false); }}
                className="rounded bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-orange-600">
                Sí
              </button>
              <button onClick={() => setConfirmNewSession(false)}
                className="text-neutral-500 hover:text-neutral-300">No</button>
            </div>
          )}
        </div>
      </header>

      {/* ── Connect + Recientes ─────────────────────────────── */}
      <div className="flex flex-col gap-2 rounded-xl border border-kick-border bg-kick-panel px-4 py-3">
        <ConnectForm status={status} channelSlug={channelInfo?.slug ?? ""} onConnect={handleConnect} onStop={stop} />
        <FrequentChannels onConnect={handleConnect} currentSlug={channelInfo?.slug} />
      </div>

      {liveWarning && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-yellow-400">El canal no está en vivo</p>
            <p className="text-xs text-yellow-400/70">{liveWarning} no está transmitiendo ahora.</p>
          </div>
          <button onClick={() => { setLiveWarning(null); connect(liveWarning); }}
            className="rounded-lg border border-yellow-500/40 px-3 py-1.5 text-xs text-yellow-400 hover:bg-yellow-500/10">
            Conectar de todas formas
          </button>
        </div>
      )}
      {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

      {/* ── Waiting mode ────────────────────────────────────── */}
      {isWaiting && channelInfo && (
        <div className="overflow-hidden rounded-xl border border-blue-400/20 bg-kick-panel">
          {channelInfo.user?.profilePic && (
            <div className="flex justify-center pt-6">
              <img src={channelInfo.user.profilePic} alt=""
                className="h-16 w-16 rounded-full object-cover ring-2 ring-blue-400/30" />
            </div>
          )}
          <div className="flex flex-col items-center gap-3 px-6 py-5 text-center">
            <div>
              <div className="flex items-center justify-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-blue-400" />
                <span className="font-semibold text-neutral-100">
                  Esperando que <span className="text-blue-400">{channelInfo.user?.username || channelInfo.slug}</span> inicie el directo
                </span>
              </div>
              <p className="mt-1 text-xs text-neutral-500">Se revisará cada {WAIT_POLL_MS / 1000}s · La sesión comenzará automáticamente</p>
            </div>
            <LastLiveInfo slug={channelInfo.slug} />
            <button onClick={cancelWaiting} className="rounded-lg border border-kick-border px-4 py-1.5 text-xs text-neutral-400 hover:border-red-500/50 hover:text-red-400">
              Cancelar espera
            </button>
          </div>
        </div>
      )}

      {/* ── Active session ──────────────────────────────────── */}
      {isActive && (
        <>
          {/* 1 — Channel info */}
          <StatsBar status={status} channelInfo={channelInfo} stats={stats}
            titleChanges={titleChanges} categoryHistory={categoryHistory} onRefresh={refreshChannelInfo}
            isPriority={priority === channelInfo?.slug}
            onSetPriority={() => {
              const slug = channelInfo?.slug;
              if (!slug) return;
              if (priority === slug) { clearPriority(); setPriorityState(null); }
              else { setPriority(slug); setPriorityState(slug); }
            }}
          />
          <BackfillBar backfill={backfill} liveStartedAt={channelInfo?.liveStartedAt ?? null} />

          {/* 2 — Contextual alerts (non-intrusive) */}
          {(activePoll || activePrediction) && (
            <div className="flex flex-col gap-3">
              {activePoll       && <PollDisplay       poll={activePoll}             />}
              {activePrediction && <PredictionDisplay prediction={activePrediction} />}
            </div>
          )}

          {/* 3 — User tracker */}
          {trackedUsername && <UserTracker username={trackedUsername} emoteMap={emoteMap} />}

          {/* 4 — PRIMARY: chat + ranking */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <ChatFeed messages={messages} emoteMap={emoteMap} subscriberBadges={channelInfo?.subscriberBadges ?? []} chatroomId={channelInfo?.chatroomId ?? null}
              onUserClick={(username) => {
                const rank = ranking.findIndex((u) => u.username === username);
                const user = ranking[rank];
                if (user) setSelectedUser({ user, rank: rank + 1 });
              }} />
            <RankingTable ranking={ranking} totalMessages={stats.totalMessages} emoteMap={emoteMap} trackedUsername={trackedUsername} onTrack={trackUser} onSelect={setSelectedUser} />
          </div>

          {/* 5 — ANALYTICS: tabbed to reduce scroll */}
          {hasAnalytics && (
            <div className="flex flex-col gap-3 rounded-xl border border-kick-border bg-kick-panel/40 p-3">
              {/* Tab bar */}
              <div className="flex flex-wrap gap-1">
                {ANALYTICS_TABS.filter((t) => {
                  if (t.key === "activity"   && !hasActivity)   return false;
                  if (t.key === "emotes"     && !hasEmotes)     return false;
                  if (t.key === "categories" && !hasCategories) return false;
                  if (t.key === "donations"  && !hasDonations)  return false;
                  if (t.key === "mods"       && !activeMods?.length)  return false;
                  return true;
                }).map((t) => (
                  <button key={t.key} onClick={() => setAnalyticsTab(t.key)}
                    className={`rounded-lg px-3 py-1.5 text-xs transition ${analyticsTab === t.key ? "bg-kick-green/15 text-kick-green border border-kick-green/40" : "border border-kick-border text-neutral-400 hover:text-neutral-200"}`}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="flex flex-col gap-4">

                {analyticsTab === "activity" && (
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr] lg:items-stretch">
                      {hasActivity && <ActivityChart timeSeries={timeSeries} peaks={peaks} peakUsers={peakUsers} quietMoment={quietMoment} />}
                      <div className="flex flex-col gap-4">
                        {lurkerStats && <LurkerStats lurkerStats={lurkerStats} />}
                        <ChatAI messages={messages} channelInfo={channelInfo} emoteMap={{ ...emoteMap, ...kickEmoteMap }} active={status === "connected"} />
                      </div>
                    </div>
                    {retentionData && <ChatterStats retentionData={retentionData} categoryHistory={categoryHistory} />}
                    {topCommands?.length > 0 && <CommandStats commands={topCommands} />}
                    {pinnedMessages?.length > 0 && (
                      <PinnedMessages pinnedMessages={pinnedMessages} emoteMap={emoteMap} />
                    )}
                  </div>
                )}

                {analyticsTab === "emotes" && (
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {emoteRanking.length > 0 && <EmoteRanking emoteRanking={emoteRanking} totalMessages={stats.totalMessages} />}
                    {emoteByHour?.length > 0  && <EmoteByHour emoteByHour={emoteByHour} />}
                  </div>
                )}

                {analyticsTab === "categories" && hasCategories && (
                  <CategoryTimeline categoryHistory={categoryHistory} categoryStats={categoryStats} sessionStart={stats.startedAt} />
                )}

                {analyticsTab === "donations" && (
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {donors && <TopDonors donors={donors} />}
                    <SubCounter subCount={subCount} giftCount={giftCount} subEvents={subEvents} />
                  </div>
                )}

                {analyticsTab === "mods" && activeMods?.length > 0 && (
                  <ActiveMods activeMods={activeMods} />
                )}


              </div>
            </div>
          )}
        </>
      )}

      {/* ── Post-stop ranking ───────────────────────────────── */}
      {!isActive && !isWaiting && ranking.length > 0 && (
        <RankingTable ranking={ranking} totalMessages={stats.totalMessages} emoteMap={emoteMap} />
      )}

      {/* ── Empty state ─────────────────────────────────────── */}
      {!isActive && !isWaiting && ranking.length === 0 && (
        <EmptyState onConnect={handleConnect} />
      )}

      {showSummary && lastSummary && (
        <SessionSummary summary={lastSummary} onClose={() => setShowSummary(false)} />
      )}

      {/* ── User modal (global — triggered from chat or ranking) */}
      {selectedUser && (
        <UserModal user={selectedUser.user} rank={selectedUser.rank}
          totalMessages={stats.totalMessages} emoteMap={emoteMap}
          onClose={() => setSelectedUser(null)} />
      )}

      {/* ── Floating combo ──────────────────────────────────── */}
      {activeCombo && (
        <div className="fixed bottom-6 right-6 z-40 w-72">
          <ComboDisplay combo={activeCombo} />
        </div>
      )}

      {/* ── Toast notifications ─────────────────────────────── */}
      <ToastContainer />
    </main>
  );
}
