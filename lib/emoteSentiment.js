// Emote concept dictionary — maps emote names (lowercase) to their cultural meaning.
// Covers Kick native emotes and the most common 7TV/BTTV/FFZ emotes.

export const EMOTE_CONCEPTS = {
  // Canal de Baulo
  "o7":        { concept: "despedida del stream / señal de respeto", category: "love" },
  "11":        { concept: "sorpresa o susto — algo inesperado o impactante pasó", category: "shocked" },
  "aww":       { concept: "algo le parece tierno o adorable", category: "love" },
  "saltito":   { concept: "sapito saltando — emoción, ansia de que pase algo o situación random", category: "hype" },
  "52":        { concept: "escuchaste algo raro o sorprendente — reacción de extrañeza a algo que se oyó", category: "shocked" },
  "83":        { concept: "sorpresa extrema — algo dejó a todos con la boca abierta", category: "shocked" },
  "catge":     { concept: "el gato de Baulo — cariño hacia la mascota del streamer o cuando aparece en stream", category: "love" },
  // ── Risa / Burla ──────────────────────────────────────────────────────────
  kekw:        { concept: "riendo de algo absurdo",     category: "funny",     icon: "😂" },
  lul:         { concept: "risa básica",                category: "funny",     icon: "😂" },
  lulw:        { concept: "risa exagerada",             category: "funny",     icon: "😂" },
  omegalul:    { concept: "risa extrema, muy gracioso", category: "funny",     icon: "😂" },
  pepeLaugh:   { concept: "riendo con malicia",         category: "funny",     icon: "😂" },
  pepplaugh:   { concept: "riendo sin parar",           category: "funny",     icon: "😂" },
  lulge:       { concept: "risa colectiva",             category: "funny",     icon: "😂" },
  hahaa:       { concept: "risita incómoda",            category: "funny",     icon: "😄" },
  monkalaugh:  { concept: "riendo nerviosamente",       category: "funny",     icon: "😅" },
  caught:      { concept: "pillado en algo",            category: "funny",     icon: "👀" },
  jebaited:    { concept: "cayó en la trampa",          category: "funny",     icon: "🪤" },
  aware:       { concept: "todos lo saben",             category: "funny",     icon: "🫣" },
  pepega:      { concept: "algo muy tonto pasó",        category: "funny",     icon: "🤪" },
  "4head":     { concept: "obviedad, fácil decirlo",    category: "funny",     icon: "🙄" },
  gigachad:    { concept: "algo épicamente basado",     category: "funny",     icon: "💪" },
  forsencd:    { concept: "predictable, sin sorpresa",  category: "funny",     icon: "😏" },

  // ── Hype / Emoción ────────────────────────────────────────────────────────
  pogchamp:    { concept: "sorpresa y emoción máxima",  category: "hype",      icon: "🔥" },
  pog:         { concept: "algo impresionante pasó",    category: "hype",      icon: "😮" },
  pogu:        { concept: "pog con más emoción",        category: "hype",      icon: "🤩" },
  poggies:     { concept: "hype colectivo",             category: "hype",      icon: "🎉" },
  pagman:      { concept: "anticipando algo épico",     category: "hype",      icon: "👀" },
  poggers:     { concept: "muy hypeado",                category: "hype",      icon: "🔥" },
  clap:        { concept: "aplausos, bien hecho",       category: "hype",      icon: "👏" },
  hyperclap:   { concept: "aplausos exagerados",        category: "hype",      icon: "👏" },
  catjam:      { concept: "vibeando con la música",     category: "hype",      icon: "🎵" },
  pepjam:      { concept: "vibeando",                   category: "hype",      icon: "🎵" },
  blobdance:   { concept: "bailando de emoción",        category: "hype",      icon: "🕺" },
  omegalam:    { concept: "hype máximo, GOAT moment",   category: "hype",      icon: "🐐" },
  lesgoo:      { concept: "a la acción, vamos",         category: "hype",      icon: "🚀" },
  goat:        { concept: "el mejor, sin dudas",        category: "hype",      icon: "🐐" },
  ez:          { concept: "fue muy fácil, dominaron",   category: "hype",      icon: "😎" },
  ezy:         { concept: "demasiado fácil",            category: "hype",      icon: "😏" },
  gg:          { concept: "bien jugado, respeto",       category: "hype",      icon: "🤝" },
  "5head":     { concept: "jugada inteligente, big brain", category: "hype",   icon: "🧠" },
  pausechamp:  { concept: "esperando el momento clave", category: "hype",      icon: "⏸️" },
  monkaw:      { concept: "momento de máxima tensión",  category: "hype",      icon: "😨" },

  // ── Tristeza / Derrota ────────────────────────────────────────────────────
  sadge:       { concept: "tristeza, algo salió mal",   category: "sad",       icon: "😢" },
  pepehands:   { concept: "tristeza profunda",          category: "sad",       icon: "😢" },
  feelsbadman: { concept: "mala vibra, sin suerte",     category: "sad",       icon: "😞" },
  pepesad:     { concept: "emo, todo mal",              category: "sad",       icon: "😔" },
  widepeeposad:{ concept: "tristeza extrema",           category: "sad",       icon: "😭" },
  peeposad:    { concept: "tristeza sincera",           category: "sad",       icon: "😢" },
  rip:         { concept: "eliminado, se acabó",        category: "sad",       icon: "💀" },
  f:           { concept: "respetos, cayó",             category: "sad",       icon: "🪦" },
  pogsad:      { concept: "sorprendido y triste",       category: "sad",       icon: "😮‍💨" },
  peeporain:   { concept: "llorando bajo la lluvia",    category: "sad",       icon: "🌧️" },

  // ── Nerviosismo / Tensión ────────────────────────────────────────────────
  monkas:      { concept: "nervioso, algo va a pasar",  category: "nervous",   icon: "😰" },
  monkasteer:  { concept: "mirando nerviosamente",      category: "nervous",   icon: "👀" },
  monkahmm:    { concept: "sospechoso, algo huele mal", category: "nervous",   icon: "🤔" },
  monkaw2:     { concept: "terror absoluto",            category: "nervous",   icon: "😱" },
  pepescared:  { concept: "miedo real",                 category: "nervous",   icon: "😨" },
  peeposcared: { concept: "asustado",                   category: "nervous",   icon: "😱" },
  widepepohappy: { concept: "feliz pero nervioso",      category: "nervous",   icon: "😬" },

  // ── Copium / Excusas ─────────────────────────────────────────────────────
  copium:      { concept: "buscando excusas para cope", category: "copium",    icon: "🤡" },
  hopium:      { concept: "esperanza irracional",       category: "copium",    icon: "🙏" },
  tinfoil:     { concept: "teorías conspirativas",      category: "copium",    icon: "🎩" },
  schizo:      { concept: "perdió la cabeza coping",    category: "copium",    icon: "🌀" },
  cope:        { concept: "en negación total",          category: "copium",    icon: "😤" },
  widepeeporain: { concept: "llorando y copando",       category: "copium",    icon: "😭" },

  // ── Enojo / Tóxico ───────────────────────────────────────────────────────
  babyrage:    { concept: "rabia de bebé, berrinche",   category: "angry",     icon: "😡" },
  pepecop:     { concept: "actuando como policía tóxico", category: "angry",   icon: "🚨" },
  madge:       { concept: "enojado sin razón",          category: "angry",     icon: "😤" },
  peepoangry:  { concept: "furia genuina",              category: "angry",     icon: "🤬" },
  angy:        { concept: "molesto",                    category: "angry",     icon: "😠" },

  // ── Amor / Buena onda ────────────────────────────────────────────────────
  love:        { concept: "amor genuino al streamer",   category: "love",      icon: "❤️" },
  koncha:      { concept: "ternura asiática",           category: "love",      icon: "🥰" },
  catpat:      { concept: "palmadita cariñosa",         category: "love",      icon: "🫶" },
  pepehug:     { concept: "abrazo virtual",             category: "love",      icon: "🤗" },
  peepolove:   { concept: "amor de comunidad",          category: "love",      icon: "💕" },
  widepeepolove: { concept: "amor masivo",              category: "love",      icon: "❤️" },
  heart:       { concept: "cariño al contenido",        category: "love",      icon: "💚" },

  // ── Burla / Based ────────────────────────────────────────────────────────
  based:       { concept: "opinión sin filtro, respeto", category: "based",    icon: "😎" },
  trihard:     { concept: "esforzándose en el chat",    category: "based",     icon: "💪" },
  modcheck:    { concept: "viendo si hay mods activos", category: "based",     icon: "👁️" },
  wutface:     { concept: "confundido y asqueado",      category: "based",     icon: "😵" },
  pog2:        { concept: "pog de segunda generación",  category: "hype",      icon: "😮" },
  weirdchamp:  { concept: "algo extraño pasó",          category: "based",     icon: "🤨" },
  ojoj:        { concept: "uy uy, esto se pone bueno",  category: "based",     icon: "👀" },
  mmods:       { concept: "llamando a los moderadores", category: "based",     icon: "📢" },

  // ── Aburrimiento ──────────────────────────────────────────────────────────
  peposleep:   { concept: "aburrido, se durmió",        category: "bored",     icon: "😴" },
  peepotired:  { concept: "cansado del contenido",      category: "bored",     icon: "😪" },
  zzz:         { concept: "dormido, sin interés",       category: "bored",     icon: "💤" },
  sleepge:     { concept: "chat en coma",               category: "bored",     icon: "😴" },
};

export const CATEGORY_META = {
  funny:   { label: "Riendo",        icon: "😂", color: "#fbbf24" },
  hype:    { label: "Hypeado",       icon: "🔥", color: "#f97316" },
  sad:     { label: "Triste",        icon: "😢", color: "#60a5fa" },
  nervous: { label: "Tenso",         icon: "😰", color: "#a78bfa" },
  copium:  { label: "Copium",        icon: "🤡", color: "#34d399" },
  angry:   { label: "Enojado",       icon: "😡", color: "#ef4444" },
  love:    { label: "Buena onda",    icon: "❤️", color: "#f43f5e" },
  based:   { label: "Based",         icon: "😎", color: "#94a3b8" },
  bored:   { label: "Aburrido",      icon: "😴", color: "#6b7280" },
};

// Map 7TV tags to our categories
const TAG_TO_CATEGORY = {
  laugh:   "funny", funny:    "funny", lol:    "funny", kek:    "funny", cringe: "funny",
  hype:    "hype",  pog:      "hype",  win:    "hype",  epic:   "hype",  gg:     "hype",
  clap:    "hype",  dance:    "hype",  vibe:   "hype",  music:  "hype",  fire:   "hype",
  sad:     "sad",   cry:      "sad",   rip:    "sad",   loss:   "sad",   feels:  "sad",
  angry:   "angry", rage:     "angry", mad:    "angry",
  nervous: "nervous", scared: "nervous", sus:  "nervous", anxiety: "nervous",
  cope:    "copium", copium:  "copium",
  love:    "love",  cute:     "love",  heart:  "love",  wholesome: "love",
  bored:   "bored", sleep:    "bored", dead:   "bored",
};

// Infer category from emote name patterns
function inferFromName(name) {
  const n = name.toLowerCase();
  if (/laugh|lul|kek|lol|haha|rofl|omeg/.test(n))   return "funny";
  if (/pog|hype|clap|gg|win|ez|goat|fire/.test(n))  return "hype";
  if (/sad|cry|rip|dead|loss|feel/.test(n))          return "sad";
  if (/monka|scare|fear|sweat|sus/.test(n))          return "nervous";
  if (/cop(e|ium)|cope|hope/.test(n))                return "copium";
  if (/love|heart|cute|hug|pat/.test(n))             return "love";
  if (/rage|angry|mad|bab/.test(n))                  return "angry";
  if (/sleep|zzz|bored|dead/.test(n))                return "bored";
  return null;
}


export function analyzeEmoteSentiment(messages, emoteMap, emoteTags = {}) {
  const categoryCounts = {};
  const conceptCounts  = {};
  const emoteMapLower  = new Set(Object.keys(emoteMap).map(k => k.toLowerCase()));
  let total = 0;

  for (const m of messages) {
    const content = m.content || "";
    // Kick built-in emotes: [emote:ID:Name]
    const kickNames = [...content.matchAll(/\[emote:\d+:([^\]]+)\]/g)].map(r => r[1].toLowerCase());
    // 7TV emotes: plain words matching emoteMap
    const sevenTvNames = content.split(/\s+/)
      .map(w => w.toLowerCase())
      .filter(w => emoteMapLower.has(w));

    for (const name of [...kickNames, ...sevenTvNames].filter(n => {
      // Filter garbage: repeated chars (aaaa, ggggg), too short, pure numbers, sounds
      if (n.length < 2) return false;
      if (/^(.)\1{2,}$/.test(n)) return false;        // aaaa, ggggg
      if (/^(ja|je|ha|he|xd|lol|jaj)+$/i.test(n)) return false; // jajaja, lolol
      if (/^\d+$/.test(n)) return false;
      if (n.length > 30) return false;
      return true;
    })) {
      // 1. Known concept from dictionary
      let data = EMOTE_CONCEPTS[name];
      let category = data?.category;

      // 2. Auto-classify via 7TV tags
      if (!category) {
        const tags = emoteTags[name] ?? emoteTags[Object.keys(emoteTags).find(k => k.toLowerCase() === name)] ?? [];
        for (const tag of tags) {
          const mapped = TAG_TO_CATEGORY[tag.toLowerCase()];
          if (mapped) { category = mapped; break; }
        }
      }

      // 3. Infer from emote name patterns
      if (!category) category = inferFromName(name);

      if (!category) continue;

      categoryCounts[category] = (categoryCounts[category] ?? 0) + 1;
      conceptCounts[name]      = (conceptCounts[name]      ?? 0) + 1;

      // Store enriched concept if not in dictionary
      if (!data) {
        const catMeta = CATEGORY_META[category];
        data = { concept: `reacción con ${name}`, category, icon: catMeta?.icon ?? "💬" };
        EMOTE_CONCEPTS[name] = data; // cache for future
      }
      total++;
    }
  }

  if (total < 5) return null;

  // Top concepts (actual emotes used most)
  const topConcepts = Object.entries(conceptCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, count]) => ({
      name,
      count,
      ...EMOTE_CONCEPTS[name],
    }));

  // Category breakdown
  const breakdown = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => ({
      category,
      count,
      pct: Math.round((count / total) * 100),
      ...CATEGORY_META[category],
    }));

  const dominant = breakdown[0];

  // Generate a natural language description of what the chat is feeling
  let narrative = null;
  if (topConcepts.length > 0) {
    const parts = topConcepts.map(c => `${c.icon} ${c.concept}`);
    narrative = parts.join(" · ");
  }

  return { dominant, breakdown, topConcepts, narrative, total };
}
