"use client";

export default function ChatInsights({ chatAnalysis }) {
  if (!chatAnalysis || chatAnalysis.msgCount < 30) return null;

  const {
    overallMood, topEmotes, emoteMoodBreakdown,
    textSentiment, isIronic, capsRatio, shortRatio, questionRatio,
    culture, topWords, copyPaste, emoteSource, description,
  } = chatAnalysis;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-kick-border bg-kick-panel p-4">

      {/* ── Header ───────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Chat</span>
          <p className="text-[10px] text-neutral-600">{chatAnalysis.msgCount.toLocaleString()} mensajes analizados</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-kick-border bg-black/40 px-2.5 py-1.5">
          <span className="text-base leading-none">{overallMood.icon}</span>
          <span className="text-xs font-semibold text-neutral-100">{overallMood.label}</span>
        </div>
      </div>

      {/* ── Description ───────────────────────────────────── */}
      <p className="rounded-lg border border-kick-green/20 bg-kick-green/5 px-3 py-2.5 text-xs leading-relaxed text-neutral-200">
        {description}
      </p>

      {/* ── Top emotes con significado ────────────────────── */}
      {topEmotes.length > 0 && (
        <div className="flex flex-col gap-1 rounded-lg border border-kick-border/50 bg-black/30 px-3 py-2">
          <span className="text-[10px] uppercase tracking-wider text-neutral-600 mb-0.5">Emotes y lo que expresan</span>
          {topEmotes.slice(0, 4).map((e) => (
            <div key={e.name} className="flex items-center gap-2">
              <span className="text-sm leading-none shrink-0">
                {emoteMoodBreakdown.find(m => m.mood === e.mood)?.icon ?? "💬"}
              </span>
              <span className="font-mono text-[11px] font-semibold text-neutral-200 shrink-0">{e.name}</span>
              <span className="text-[10px] text-neutral-500 flex-1">— {e.meaning}</span>
              <span className="font-mono text-[10px] text-neutral-600 shrink-0">×{e.count}</span>
            </div>
          ))}
          {/* Mood breakdown bar */}
          {emoteMoodBreakdown.length > 1 && (
            <div className="mt-1.5 flex h-1.5 w-full overflow-hidden rounded-full">
              {emoteMoodBreakdown.map((m) => (
                <div key={m.mood} style={{ width: `${m.pct}%`, background: m.color }}
                  title={`${m.label} ${m.pct}%`} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Pills de señales ─────────────────────────────── */}
      <div className="flex flex-wrap gap-1.5 text-[10px]">
        {textSentiment && (
          <span className={`rounded-full border border-kick-border bg-black/30 px-2 py-0.5 ${
            textSentiment.score > 0.1 ? "text-kick-green" :
            textSentiment.score < -0.1 ? "text-red-400" : "text-neutral-400"
          }`}>
            {textSentiment.score > 0.1 ? "😊" : textSentiment.score < -0.1 ? "😠" : "😐"} {textSentiment.label}
          </span>
        )}
        {isIronic && (
          <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-purple-300">
            😏 Chat irónico
          </span>
        )}
        {capsRatio > 25 && (
          <span className="rounded-full border border-kick-border bg-black/30 px-2 py-0.5 text-orange-400">
            🔠 {capsRatio}% caps
          </span>
        )}
        {questionRatio > 15 && (
          <span className="rounded-full border border-kick-border bg-black/30 px-2 py-0.5 text-blue-400">
            ❓ {questionRatio}% preguntas
          </span>
        )}
        {culture && (
          <span className="rounded-full border border-kick-border bg-black/30 px-2 py-0.5 text-neutral-300">
            🌎 {culture === "argentina" ? "🇦🇷 Argentino" :
                culture === "mexicana"  ? "🇲🇽 Mexicano"  :
                culture === "gamer"     ? "🎮 Gamer"      : "🌎 Latino"}
          </span>
        )}
        {emoteSource && (
          <span className={`rounded-full border px-2 py-0.5 ${
            emoteSource.label === "normie" ? "border-yellow-400/30 text-yellow-400" :
            emoteSource.label === "7tv"    ? "border-purple-500/30 text-purple-400" :
                                             "border-kick-border text-neutral-400"
          }`}>
            {emoteSource.label === "normie" ? "😐 Normie" :
             emoteSource.label === "7tv"    ? "🟣 7TV"    : "🔀 Mixto"} · Kick {emoteSource.kickPct}%
          </span>
        )}
        {copyPaste?.count >= 8 && (
          <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-red-300">
            🤣 copy-paste ×{copyPaste.count}
          </span>
        )}
      </div>

      {/* ── Top palabras ─────────────────────────────────── */}
      {topWords.length >= 3 && (
        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-neutral-600">
          <span>Más repetidas:</span>
          {topWords.slice(0, 5).map(w => (
            <span key={w.word} className="font-mono text-neutral-400">
              "{w.word}" <span className="text-neutral-700">×{w.count}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
