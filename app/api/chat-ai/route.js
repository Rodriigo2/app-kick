export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await fetch("http://localhost:11434/api/tags", { cache: "no-store" });
    if (!res.ok) return Response.json({ ok: false, error: `HTTP ${res.status}` });
    const data = await res.json();
    const models = (data?.models ?? []).map(m => m.name);
    const hasModel = models.some(m => m.startsWith("qwen2.5:3b"));
    return Response.json({ ok: true, models, hasModel });
  } catch (e) {
    return Response.json({ ok: false, error: e?.message });
  }
}

const OLLAMA_URL = "http://localhost:11434/api/chat";
const MODEL      = "qwen2.5:3b";

// ── Emote knowledge base ──────────────────────────────────────────────────────
const EMOTE_KNOWLEDGE = {
  kekw:"riendo de algo absurdo o cringe", lul:"risa básica", lulw:"carcajada exagerada",
  omegalul:"algo extremadamente gracioso", pepeLaugh:"riendo con malicia",
  sadge:"tristeza, algo salió mal", saj:"tristeza, pena, momento triste",
  pepehands:"tristeza profunda", peeporain:"llorando bajo la lluvia",
  pog:"algo impresionante pasó", pogchamp:"sorpresa y emoción máxima",
  pogu:"emoción intensa", poggies:"hype colectivo", pagman:"anticipando algo épico",
  clap:"bien hecho, aplausos", catjam:"vibeando con la música",
  "ez":"fue demasiado fácil", gg:"bien jugado/se acabó",
  "5head":"jugada muy inteligente, big brain", monkas:"nervioso, algo va a pasar",
  monkaw:"terror, situación crítica", monkahmm:"sospechoso",
  copium:"en negación, buscando excusas", hopium:"esperanza irracional",
  babyrage:"rabia de bebé", madge:"enojado sin razón",
  wtf:"¿QUÉ CARAJO FUE ESO? — sorpresa absoluta",
  pepehug:"abrazo virtual, cariño", love:"amor genuino",
  caught:"pillado haciendo algo", aware:"todos se dieron cuenta",
  jebaited:"cayó en la trampa", based:"opinión sin filtros, respeto",
  weirdchamp:"algo extraño pasó", peposleep:"aburrido, se durmió",
};

function inferEmoteMeaning(name) {
  const n = name.toLowerCase();
  if (/^ag+$/i.test(n))             return "tonto, bobo, no entiende — burla por algo estúpido";
  if (/laugh|lul|kek|haha/.test(n)) return "risa/burla";
  if (/sad|cry|rip|feel/.test(n))   return "tristeza";
  if (/pog|hype|clap|win/.test(n))  return "hype/emoción";
  if (/monka|scare|sweat/.test(n))  return "tensión/nerviosismo";
  if (/love|heart|cute|hug/.test(n))return "cariño";
  if (/rage|angry|mad/.test(n))     return "enojo";
  if (/cope|copium/.test(n))        return "negación/cope";
  if (/wtf|shock/.test(n))          return "sorpresa extrema";
  return null;
}

function detectEmotes(messages, emoteMap) {
  const freq    = {};
  const safeMap = emoteMap && typeof emoteMap === "object" ? emoteMap : {};
  const emoteKeys  = new Set(Object.keys(safeMap));
  const emoteLower = new Map(Object.keys(safeMap).map(k => [k.toLowerCase(), k]));

  for (const m of messages) {
    const content = String(m.content || "");
    // Kick native: [emote:ID:Name]
    for (const match of content.matchAll(/\[emote:\d+:([^\]]+)\]/g)) {
      const name = match[1]; if (!name) continue;
      freq[name] = (freq[name] ?? 0) + 1;
    }
    // 7TV / channel: plain words
    for (const word of content.split(/\s+/)) {
      if (!word) continue;
      const canonical = emoteKeys.has(word) ? word : emoteLower.get(word.toLowerCase());
      if (canonical) freq[canonical] = (freq[canonical] ?? 0) + 1;
    }
  }

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([name, count]) => {
      const info = EMOTE_KNOWLEDGE[name.toLowerCase()] ?? inferEmoteMeaning(name);
      return { name, count, meaning: info?.meaning ?? null };
    });
}

function getTopWords(messages) {
  const freq = {};
  const SKIP = new Set(["de","la","el","que","y","en","es","a","se","los","del","las",
    "por","con","para","una","como","no","si","ya","me","te","le","lo","al","su","un",
    "nos","les","pero","más","muy","todo","bien","yo","tu","vos","sos","esto","eso"]);
  for (const m of messages) {
    const words = (m.content || "")
      .replace(/\[emote:\d+:[^\]]+\]/g, "")
      .toLowerCase().split(/\s+/);
    for (const w of words) {
      const clean = w.replace(/[^a-záéíóúüñ]/gi, "");
      if (clean.length >= 3 && !SKIP.has(clean)) freq[clean] = (freq[clean] ?? 0) + 1;
    }
  }
  return Object.entries(freq).sort((a,b) => b[1]-a[1]).slice(0, 8).map(([w,c]) => `${w}(×${c})`);
}

function buildPrompt(messages, channelName, category, streamTitle, emotes, topWords, memory) {
  const recent = messages.slice(-60);
  const formatted = recent.map((m, i) => {
    const clean = (m.content || "").replace(/\[emote:\d+:([^\]]+)\]/g, "$1");
    return `[${i+1}] ${m.username}: ${clean}`;
  }).join("\n");

  const knownEmotes   = emotes.filter(e => e.meaning);
  const unknownEmotes = emotes.filter(e => !e.meaning);

  const emoteSection = emotes.length > 0
    ? `\nEMOTES EN USO AHORA MISMO (últimos 25 mensajes — solo estos, no de la memoria):\n` +
      (knownEmotes.length > 0
        ? knownEmotes.map(e => `  • ${e.name} ×${e.count} → ${e.meaning}`).join("\n") + "\n"
        : "") +
      (unknownEmotes.length > 0
        ? `Sin concepto conocido — interpretá por contexto:\n` +
          unknownEmotes.map(e => `  • ${e.name} ×${e.count}`).join("\n")
        : "")
    : "\n(No hay emotes en los mensajes recientes)\n";

  const wordsSection = topWords.length > 0
    ? `\nPALABRAS MÁS REPETIDAS: ${topWords.join(", ")}`
    : "";

  const memorySection = memory
    ? `\nMI MEMORIA DE ESTE CHAT (mis notas anteriores):\n${memory}\n`
    : "\n[Primera vez analizando — sin memoria previa]\n";

  const streamContext = [
    category    && `Categoría: ${category}`,
    streamTitle && `Título del stream: "${streamTitle}"`,
  ].filter(Boolean).join(" · ");

  return `Sos un chatter más de ${channelName || "este canal"}. Llevás tiempo en este chat, conocés a la gente, sabés cómo hablan, qué emotes usan y qué significan. Ahora te piden que le cuentes a alguien externo qué está pasando en el chat en este momento.

STREAM: ${channelName || "streamer"}${streamContext ? ` — ${streamContext}` : ""}
${memorySection}
${emoteSection}${wordsSection}

MENSAJES DEL CHAT:
${formatted}

Contá qué está pasando como si fueras vos el que está en el chat. Podés:
- Describir el ambiente y el tono con tus propias palabras
- Decir si el chat está tranquilo, caliente, divertido, nervioso, triste
- Mencionar qué emote domina y qué están expresando con él
- Señalar algo específico que esté pasando (un momento, un chiste, una reacción colectiva)
- Notar si hay ironía, burla, cariño o tensión
- Hablar de alguien del chat si destaca

No hablés como un analista ni uses frases hechas. Hablá como alguien que vive esto. Variá el enfoque cada vez — cada momento del chat es distinto.

REGLAS:
- Solo lo que está en los mensajes. No inventes nada.
- Emotes sin comillas ni dos puntos: SAJ no 'SAJ' ni :SAJ:
- Si no hay ironía obvia, no la menciones.

Respondé SOLO con este JSON (sin markdown, sin texto extra):
{
  "mood": "el vibe del chat ahora en una o dos palabras",
  "mood_icon": "un emoji que lo represente — el carácter directo, no :texto:",
  "topics": ["qué están hablando concretamente, sin generalidades vacías"],
  "irony": true/false,
  "irony_note": "ejemplo literal del chat que muestre la ironía, o null",
  "description": "3-5 oraciones como las escribiría alguien del chat. Naturales, específicas, con personalidad. Que capture lo que está pasando de verdad en este momento.",
  "memory": "Tu cuaderno personal sobre esta comunidad: cómo son, qué los define, qué significan sus emotes específicos, sus expresiones típicas, su relación con el streamer, momentos que recordás. Actualizá con cada análisis. Máx 200 palabras."
}`;
}

export async function POST(request) {
  try {
    const { messages, channelName, category, streamTitle, emoteMap, memory } = await request.json();
    if (!messages?.length) return Response.json({ error: "No messages" }, { status: 400 });

    // Only detect emotes from the most recent messages — reflects what's happening NOW
    const recentForEmotes = messages.slice(-25);
    const emotes   = detectEmotes(recentForEmotes, emoteMap ?? {});
    const topWords = getTopWords(messages.slice(-60));
    const prompt   = buildPrompt(messages, channelName, category, streamTitle, emotes, topWords, memory);

    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 30_000);

    let res;
    try {
      res = await fetch(OLLAMA_URL, {
        method:  "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model:    MODEL,
          messages: [{ role: "user", content: prompt }],
          stream:   false,
          options:  { temperature: 0.8, num_predict: 600 },
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) return Response.json({ error: `Ollama error: ${await res.text()}` }, { status: 502 });

    const data = await res.json();
    const raw  = data?.message?.content ?? "";

    // Try multiple strategies to extract JSON
    let analysis = null;

    // 1. Direct JSON match
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try { analysis = JSON.parse(jsonMatch[0]); } catch {}
    }

    // 2. Strip markdown code blocks and retry
    if (!analysis) {
      const stripped = raw.replace(/```json?/gi, "").replace(/```/g, "").trim();
      const m2 = stripped.match(/\{[\s\S]*\}/);
      if (m2) try { analysis = JSON.parse(m2[0]); } catch {}
    }

    // 3. Fallback — ask again with simpler prompt
    if (!analysis) {
      const retry = await fetch(OLLAMA_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          messages: [{
            role: "user",
            content: `Describí en JSON el mood de este chat de streaming. Solo JSON, sin texto extra:\n${raw.slice(0,200)}\n\n{"mood":"...","mood_icon":"...","topics":[],"irony":false,"irony_note":null,"style":"...","description":"..."}`
          }],
          stream: false,
          options: { temperature: 0.1, num_predict: 300 },
        }),
        signal: AbortController ? (() => { const c = new AbortController(); setTimeout(() => c.abort(), 15_000); return c.signal; })() : undefined,
      });
      if (retry.ok) {
        const r2   = await retry.json();
        const raw2 = r2?.message?.content ?? "";
        const m3   = raw2.match(/\{[\s\S]*\}/);
        if (m3) try { analysis = JSON.parse(m3[0]); } catch {}
      }
    }

    if (!analysis) {
      return Response.json({ error: `Ollama no devolvió JSON válido. Respuesta: ${raw.slice(0, 200)}` }, { status: 500 });
    }

    return Response.json({ analysis, emotesDetected: emotes });

  } catch (err) {
    if (err?.name === "TimeoutError")
      return Response.json({ error: "Ollama tardó demasiado — el modelo puede estar cargando" }, { status: 504 });
    return Response.json({ error: err?.message ?? "Error desconocido" }, { status: 500 });
  }
}
