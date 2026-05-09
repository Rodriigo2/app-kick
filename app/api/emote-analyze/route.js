import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const G = globalThis;
G.__emoteConceptCache = G.__emoteConceptCache || new Map(); // url → { concept, category, icon }

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CATEGORY_MAP = {
  riendo: "funny", gracioso: "funny", chistoso: "funny", burla: "funny", jaja: "funny",
  hype: "hype", emocionado: "hype", sorprendido: "hype", épico: "hype", impresionado: "hype",
  triste: "sad", llorando: "sad", pena: "sad", derrota: "sad",
  nervioso: "nervous", tenso: "nervous", miedo: "nervous", asustado: "nervous",
  enojado: "angry", rabia: "angry", furioso: "angry",
  amor: "love", cariño: "love", tierno: "love",
  aburrido: "bored", dormido: "bored", cansado: "bored",
  cope: "copium", excusa: "copium", negación: "copium",
};

const CATEGORY_ICONS = {
  funny: "😂", hype: "🔥", sad: "😢", nervous: "😰",
  angry: "😡", love: "❤️", bored: "😴", copium: "🤡", unknown: "💬",
};

function inferCategory(concept) {
  const lower = concept.toLowerCase();
  for (const [keyword, cat] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(keyword)) return cat;
  }
  return "unknown";
}

async function analyzeEmote(url) {
  if (G.__emoteConceptCache.has(url)) return G.__emoteConceptCache.get(url);

  const response = await client.messages.create({
    model:      "claude-haiku-4-5-20251001",
    max_tokens: 60,
    messages:   [{
      role: "user",
      content: [
        {
          type: "image",
          source: { type: "url", url },
        },
        {
          type: "text",
          text: "Este es un emote de chat de streaming en vivo (Kick/Twitch). En máximo 5 palabras en español, describí qué emoción o reacción expresa. Solo la descripción, sin explicación.",
        },
      ],
    }],
  });

  const concept  = response.content[0]?.text?.trim() ?? "reacción desconocida";
  const category = inferCategory(concept);
  const result   = { concept, category, icon: CATEGORY_ICONS[category] };

  G.__emoteConceptCache.set(url, result);
  return result;
}

export async function POST(request) {
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.includes("REEMPLAZA")) {
    return Response.json({ error: "ANTHROPIC_API_KEY no configurada" }, { status: 503 });
  }

  let urls;
  try { ({ urls } = await request.json()); } catch {
    return Response.json({ error: "Body inválido" }, { status: 400 });
  }

  if (!Array.isArray(urls) || urls.length === 0) {
    return Response.json({ results: {} });
  }

  // Only analyze up to 5 unknown emotes per call to control costs
  const toAnalyze = urls
    .filter(u => u && typeof u === "string" && u.startsWith("http"))
    .filter(u => !G.__emoteConceptCache.has(u))
    .slice(0, 5);

  // Return cached results for already-known URLs
  const results = {};
  for (const url of urls) {
    if (G.__emoteConceptCache.has(url)) results[url] = G.__emoteConceptCache.get(url);
  }

  // Analyze new ones
  await Promise.allSettled(
    toAnalyze.map(async (url) => {
      try {
        results[url] = await analyzeEmote(url);
      } catch {
        results[url] = { concept: "reacción desconocida", category: "unknown", icon: "💬" };
      }
    })
  );

  return Response.json({ results });
}
