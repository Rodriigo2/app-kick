// ── Chat Analyzer ─────────────────────────────────────────────────────────────
// Processes every live message to understand the chat's mood, culture and
// personality. Combines emote meanings, text sentiment, slang and behavior.

// ── Emote knowledge base ──────────────────────────────────────────────────────
const EMOTE_KNOWLEDGE = {
  // Risa / burla
  kekw:         { mood: "funny",   meaning: "riendo de algo absurdo o cringe" },
  lul:          { mood: "funny",   meaning: "risa básica" },
  lulw:         { mood: "funny",   meaning: "carcajada exagerada" },
  omegalul:     { mood: "funny",   meaning: "algo extremadamente gracioso" },
  pepeLaugh:    { mood: "funny",   meaning: "riendo con malicia" },
  pepplaugh:    { mood: "funny",   meaning: "risa sin parar" },
  monkalaugh:   { mood: "funny",   meaning: "riendo nerviosamente" },
  jebaited:     { mood: "funny",   meaning: "cayó en la trampa" },
  pepega:       { mood: "funny",   meaning: "algo muy tonto pasó" },
  "4head":      { mood: "funny",   meaning: "obviedad, qué fácil era" },
  caught:       { mood: "funny",   meaning: "pillado haciendo algo" },
  aware:        { mood: "funny",   meaning: "todos se dieron cuenta" },
  gigachad:     { mood: "funny",   meaning: "algo épicamente based" },
  omg:          { mood: "funny",   meaning: "sorpresa cómica" },
  // Hype / emoción
  pogchamp:     { mood: "hype",    meaning: "sorpresa y emoción máxima" },
  pog:          { mood: "hype",    meaning: "algo impresionante pasó" },
  pogu:         { mood: "hype",    meaning: "emoción intensa" },
  poggies:      { mood: "hype",    meaning: "hype colectivo" },
  pagman:       { mood: "hype",    meaning: "anticipando algo épico" },
  clap:         { mood: "hype",    meaning: "bien hecho, aplausos" },
  catjam:       { mood: "hype",    meaning: "vibeando con la música" },
  blobdance:    { mood: "hype",    meaning: "bailando de alegría" },
  "ez":         { mood: "hype",    meaning: "fue demasiado fácil" },
  gg:           { mood: "hype",    meaning: "bien jugado / se acabó" },
  "5head":      { mood: "hype",    meaning: "jugada muy inteligente" },
  lesgoo:       { mood: "hype",    meaning: "a la acción, vamos" },
  goat:         { mood: "hype",    meaning: "el mejor sin dudas" },
  pausechamp:   { mood: "hype",    meaning: "esperando el momento clave" },
  hyperclap:    { mood: "hype",    meaning: "aplausos exagerados" },
  // Tristeza / derrota
  sadge:        { mood: "sad",     meaning: "tristeza, algo salió mal" },
  pepehands:    { mood: "sad",     meaning: "tristeza profunda" },
  feelsbadman:  { mood: "sad",     meaning: "mala vibra, sin suerte" },
  widepeeposad: { mood: "sad",     meaning: "tristeza extrema" },
  rip:          { mood: "sad",     meaning: "murió / se acabó" },
  "f":          { mood: "sad",     meaning: "respetos, cayó" },
  peeporain:    { mood: "sad",     meaning: "llorando bajo la lluvia" },
  // Nerviosismo / tensión
  monkas:       { mood: "nervous", meaning: "nervioso, algo va a pasar" },
  monkaw:       { mood: "nervous", meaning: "terror, situación crítica" },
  monkahmm:     { mood: "nervous", meaning: "sospechoso, algo huele mal" },
  pepescared:   { mood: "nervous", meaning: "miedo real" },
  // Copium / excusas
  copium:       { mood: "copium",  meaning: "buscando excusas, en negación" },
  hopium:       { mood: "copium",  meaning: "esperanza irracional" },
  cope:         { mood: "copium",  meaning: "en negación total" },
  // Enojo
  babyrage:     { mood: "angry",   meaning: "rabia de bebé, berrinche" },
  madge:        { mood: "angry",   meaning: "enojado sin razón" },
  angy:         { mood: "angry",   meaning: "molesto" },
  // Amor / buena onda
  love:         { mood: "love",    meaning: "amor genuino" },
  pepehug:      { mood: "love",    meaning: "abrazo virtual" },
  peepolove:    { mood: "love",    meaning: "cariño de la comunidad" },
  catpat:       { mood: "love",    meaning: "palmadita cariñosa" },
  // Aburrimiento
  peposleep:    { mood: "bored",   meaning: "aburrido, se quedó dormido" },
  sleepge:      { mood: "bored",   meaning: "chat en coma" },
  // Canal de Baulo — emotes específicos
  "o7":         { mood: "love",    meaning: "saludo militar de despedida o respeto — en este canal se usa para despedir el stream" },
  "11":         { mood: "shocked", meaning: "sorpresa o susto — reacción a algo inesperado o impactante" },
  "aww":        { mood: "love",    meaning: "algo le parece tierno o adorable" },
  "AWW":        { mood: "love",    meaning: "algo le parece tierno o adorable" },
  "saltito":    { mood: "hype",    meaning: "sapito saltando — emoción, ansia de que pase algo, o reacción a situaciones random" },
  "52":         { mood: "shocked", meaning: "escuchaste algo raro o sorprendente — reacción de '¿qué fue eso?' o 'me pareció extraño lo que oí'" },
  "83":         { mood: "shocked", meaning: "sorpresa extrema — algo dejó a todos con la boca abierta" },
  "catge":      { mood: "love",    meaning: "el gato de Baulo — se usa para mostrar cariño o cuando el gato aparece en el stream" },
  // Based / opinión
  based:        { mood: "based",   meaning: "opinión sin filtros, respeto" },
  weirdchamp:   { mood: "based",   meaning: "algo extraño o sospechoso" },
  modcheck:     { mood: "based",   meaning: "viendo si hay mods activos" },
  // Shock / WTF
  wtf:          { mood: "shocked", meaning: "¿QUÉ CARAJO FUE ESO? — sorpresa absoluta" },
  wutface:      { mood: "shocked", meaning: "cara de qué demonios está pasando" },
  omegalul:     { mood: "funny",   meaning: "algo extremadamente gracioso" },
  // Tristeza / SAJ
  saj:          { mood: "sad",     meaning: "tristeza, pena, momento triste" },
  peepohands:   { mood: "sad",     meaning: "tristeza, pidiendo clemencia" },
};

const MOOD_META = {
  funny:   { label: "Riendo",         icon: "😂", color: "#fbbf24" },
  hype:    { label: "Hypeado",        icon: "🔥", color: "#f97316" },
  sad:     { label: "Triste",         icon: "😢", color: "#60a5fa" },
  shocked: { label: "En shock",       icon: "😱", color: "#e879f9" },
  nervous: { label: "Tenso",          icon: "😰", color: "#a78bfa" },
  copium:  { label: "Copium",         icon: "🤡", color: "#34d399" },
  angry:   { label: "Enojado",        icon: "😡", color: "#ef4444" },
  love:    { label: "Buena onda",     icon: "❤️", color: "#f43f5e" },
  bored:   { label: "Aburrido",       icon: "😴", color: "#6b7280" },
  based:   { label: "Based",          icon: "😎", color: "#94a3b8" },
};

// ── Text sentiment ────────────────────────────────────────────────────────────
const POS_WORDS = new Set(["bueno","buena","bien","genial","increíble","excelente","perfecto","capo","groso","crack","goat","top","copado","joya","zarpado","divino","hermoso","lindo","amo","amor","gracias","dale","de una","w","dub","win","slay","based","brutal","épico","tremendo","monstruo","bestia","animal","gg","ez"]);
const NEG_WORDS = new Set(["malo","mala","mal","horrible","pésimo","odio","basura","cagada","fracaso","terrible","fatal","asco","inútil","flojo","mediocre","rata","trucho","perdió","perdimos","derrota","rip","fail","noob","l","mid","cringe"]);

// ── Slang dictionary (for classification only, not display) ──────────────────
const ARG_SLANG   = new Set(["boludo","capo","groso","copado","posta","quilombo","zarpado","che","pibe","chabón","dale","de una","piola","fierro","morfar","flashear","joya","cagada"]);
const MEX_SLANG   = new Set(["wey","güey","chido","neta","simon","cuate","cabrón","chavo","padre"]);
const GAMER_SLANG = new Set(["gg","noob","pro","grind","clutch","tryhard","speedrun","meta","buff","nerf","carry","feed","tilt","ez","rip","goat","based","ratio","mid","npc","sus","cap"]);
const IRONY_TRIGGERS = new Set(["increíble","genial","excelente","perfecto","espectacular","brillante","maravilloso"]);
const FAIL_CONTEXT   = new Set(["perdió","fail","rip","cagó","malo","noob","terrible"]);

// ── Analyzer state factory ────────────────────────────────────────────────────
export function createAnalyzer() {
  return {
    msgCount:       0,
    // Emote tracking
    emoteUses:      {},   // name → { count, mood, meaning } — only known emotes
    kickEmotes:     0,
    sevenTvEmotes:  0,
    unknownEmotes:  {},   // name → count (channel-specific, no meaning yet)
    // Text sentiment
    posWords:       0,
    negWords:       0,
    // Behavior
    capsCount:      0,
    shortCount:     0,    // ≤5 chars
    questionCount:  0,
    // Irony
    ironyCount:     0,
    // Slang culture
    argCount:       0,
    mexCount:       0,
    gamerCount:     0,
    // Word frequency (top words this session)
    wordFreq:       {},
    // Recurring messages
    msgHashes:      {},
    // Mood history per minute bucket
    minuteMoods:    [], // last 20 per-minute mood snapshots
    // Derived (rebuilt every 20 messages)
    analysis:       null,
  };
}

function isGarbageEmote(name) {
  if (!name || name.length < 2 || name.length > 25) return true;
  if (/^(.)\1{4,}$/.test(name)) return true;              // aaaaa, ggggg (5+ mismos chars)
  if (/^m+$/i.test(name) && name.length > 3) return true; // mmmmm spam
  if (/^(ja|je|ha|xd|lol){2,}$/i.test(name)) return true;
  if (/^\d+$/.test(name)) return true;
  return false;
}

// Patrones con concepto conocido — tienen prioridad sobre los tags de 7TV
const KNOWN_PATTERNS = [
  { re: /^ag+$/i, mood:"funny", meaning:"tonto, bobo, no entiende — burla por algo estúpido" },
];

function lookupEmote(name, emoteTags) {
  const lower = name.toLowerCase();
  // 1. Patrones conocidos (prioridad máxima — sabemos más que los tags)
  for (const { re, mood, meaning } of KNOWN_PATTERNS) {
    if (re.test(lower)) return { mood, meaning };
  }
  // 2. Known dictionary
  if (EMOTE_KNOWLEDGE[lower]) return EMOTE_KNOWLEDGE[lower];
  // 3. 7TV tags
  const tags = emoteTags?.[name] ?? emoteTags?.[lower] ?? [];
  const TAG_MAP = { laugh:"funny", funny:"funny", hype:"hype", pog:"hype", sad:"sad",
    cry:"sad", angry:"angry", love:"love", bored:"bored", cope:"copium", nervous:"nervous" };
  for (const tag of tags) {
    const mood = TAG_MAP[tag.toLowerCase()];
    if (mood) return { mood, meaning: `emote de ${MOOD_META[mood]?.label?.toLowerCase() ?? mood}` };
  }
  // 4. Name pattern inference
  const n = lower;
  if (/^ag+$/i.test(n))                              return { mood:"funny",   meaning:"tonto, bobo, no entiende — burla por algo estúpido" };
  if (/laugh|lul|kek|lol|haha|rofl|omeg/.test(n))   return { mood:"funny",   meaning:"emote de risa" };
  if (/pog|hype|clap|gg|win|ez|goat|fire/.test(n))  return { mood:"hype",    meaning:"emote de hype" };
  if (/sad|cry|rip|dead|loss|feel/.test(n))          return { mood:"sad",     meaning:"emote triste" };
  if (/monka|scare|fear|sweat/.test(n))              return { mood:"nervous", meaning:"emote de tensión" };
  if (/cope|hopium/.test(n))                         return { mood:"copium",  meaning:"emote de cope" };
  if (/love|heart|cute|hug|pat/.test(n))             return { mood:"love",    meaning:"emote de cariño" };
  if (/rage|angry|mad/.test(n))                      return { mood:"angry",   meaning:"emote de enojo" };
  if (/wtf|whoa|shock|owo|omg/.test(n))              return { mood:"shocked", meaning:"sorpresa extrema" };
  return null; // truly unknown
}

// ── Process a single message ──────────────────────────────────────────────────
export function processMessage(state, message, emoteMap, emoteTags) {
  if (!state || !message) return state;
  const s       = state;
  const content = message.content || "";
  const lower   = content.toLowerCase();
  s.msgCount++;

  // ── Emotes ────────────────────────────────────────────────────────────────
  // Kick native: [emote:ID:Name]
  for (const [, , name] of content.matchAll(/\[emote:\d+:([^\]]+)\]/g)) {
    if (isGarbageEmote(name)) continue;
    s.kickEmotes++;
    const info = lookupEmote(name, emoteTags);
    if (info) {
      const key = name.toLowerCase();
      if (!s.emoteUses[key]) s.emoteUses[key] = { count:0, mood:info.mood, meaning:info.meaning, name };
      s.emoteUses[key].count++;
    }
  }
  // 7TV / channel emotes (plain words)
  for (const word of content.split(/\s+/)) {
    if (!emoteMap?.[word] || isGarbageEmote(word)) continue;
    s.sevenTvEmotes++;
    const info = lookupEmote(word, emoteTags);
    if (info) {
      const key = word.toLowerCase();
      if (!s.emoteUses[key]) s.emoteUses[key] = { count:0, mood:info.mood, meaning:info.meaning, name:word };
      s.emoteUses[key].count++;
    } else {
      // Track unknown channel emotes separately
      const key = word.toLowerCase();
      s.unknownEmotes[key] = (s.unknownEmotes[key] ?? 0) + 1;
    }
  }

  // ── Text sentiment ────────────────────────────────────────────────────────
  const textWords = lower.replace(/\[emote:\d+:[^\]]+\]/g, "").split(/\s+/).filter(Boolean);
  for (const w of textWords) {
    const clean = w.replace(/[^a-záéíóúüñ]/gi, "");
    if (POS_WORDS.has(clean)) s.posWords++;
    if (NEG_WORDS.has(clean)) s.negWords++;
    if (clean.length >= 3) s.wordFreq[clean] = (s.wordFreq[clean] ?? 0) + 1;
    if (ARG_SLANG.has(clean))   s.argCount++;
    if (MEX_SLANG.has(clean))   s.mexCount++;
    if (GAMER_SLANG.has(clean)) s.gamerCount++;
  }

  // ── Irony ─────────────────────────────────────────────────────────────────
  const isAllCaps   = content.length > 5 && content === content.toUpperCase() && /[A-Z]/.test(content);
  const hasTrigger  = [...IRONY_TRIGGERS].some(t => lower.includes(t));
  const hasFailCtx  = textWords.some(w => FAIL_CONTEXT.has(w.replace(/[^a-z]/g,"")));
  if (hasTrigger && (isAllCaps || hasFailCtx)) s.ironyCount++;

  // ── Behavior ──────────────────────────────────────────────────────────────
  if (isAllCaps)                           s.capsCount++;
  if (content.trim().length <= 5)          s.shortCount++;
  if (content.trimEnd().endsWith("?"))     s.questionCount++;

  // ── Copy-paste ────────────────────────────────────────────────────────────
  const hash = content.trim().slice(0, 70).toLowerCase();
  if (hash.length > 8) s.msgHashes[hash] = (s.msgHashes[hash] ?? 0) + 1;

  // ── Rebuild analysis every 20 messages ────────────────────────────────────
  if (s.msgCount % 20 === 0 || !s.analysis) {
    s.analysis = buildAnalysis(s, emoteMap);
  }

  return s;
}

// ── Build the full analysis ───────────────────────────────────────────────────
function buildAnalysis(s, emoteMap) {
  const total = Math.max(s.msgCount, 1);

  // ── Top emotes (known ones only, sorted by use) ───────────────────────────
  const topEmotes = Object.values(s.emoteUses)
    .filter(e => e.count >= 2)
    .sort((a,b) => b.count - a.count)
    .slice(0, 5);

  // ── Emote mood breakdown ──────────────────────────────────────────────────
  const moodCounts = {};
  for (const e of Object.values(s.emoteUses)) {
    moodCounts[e.mood] = (moodCounts[e.mood] ?? 0) + e.count;
  }
  const totalEmotes = Object.values(moodCounts).reduce((a,b) => a+b, 0);
  const emoteMoodBreakdown = Object.entries(moodCounts)
    .sort((a,b) => b[1]-a[1])
    .map(([mood, count]) => ({
      mood, count,
      pct: Math.round((count / Math.max(totalEmotes, 1)) * 100),
      ...MOOD_META[mood],
    }));
  const dominantEmoteMood = emoteMoodBreakdown[0]?.mood ?? null;

  // ── Text sentiment ────────────────────────────────────────────────────────
  const sentTotal = s.posWords + s.negWords;
  const sentScore = sentTotal > 0 ? (s.posWords - s.negWords) / sentTotal : 0;
  const textSentiment = sentTotal < 5 ? null : {
    score:     sentScore,
    positive:  s.posWords,
    negative:  s.negWords,
    label:     sentScore > 0.5  ? "muy positivo" :
               sentScore > 0.1  ? "positivo" :
               sentScore < -0.5 ? "muy negativo" :
               sentScore < -0.1 ? "negativo" : "neutro",
  };

  // ── Irony ─────────────────────────────────────────────────────────────────
  const ironyRate = s.ironyCount / Math.max(total / 10, 1);
  const isIronic  = ironyRate > 2;

  // ── Behavior signals ──────────────────────────────────────────────────────
  const capsRatio     = s.capsCount    / total;
  const shortRatio    = s.shortCount   / total;
  const questionRatio = s.questionCount / total;

  // ── Culture ───────────────────────────────────────────────────────────────
  const totalSlang = s.argCount + s.mexCount + s.gamerCount;
  const culture = s.argCount > totalSlang * 0.5 && s.argCount >= 5 ? "argentina"
    : s.mexCount > totalSlang * 0.5 && s.mexCount >= 5 ? "mexicana"
    : s.gamerCount > totalSlang * 0.5 && s.gamerCount >= 8 ? "gamer"
    : totalSlang >= 5 ? "latina" : null;

  // ── Emote source ──────────────────────────────────────────────────────────
  const totalSrcEmotes = s.kickEmotes + s.sevenTvEmotes;
  const kickPct = totalSrcEmotes > 0 ? Math.round((s.kickEmotes / totalSrcEmotes) * 100) : 50;
  const emoteSource = totalSrcEmotes < 10 ? null
    : kickPct >= 70 ? "normie"
    : kickPct <= 30 ? "7tv"
    : "mixto";

  // ── Top words (vocabulary fingerprint) ───────────────────────────────────
  const STOP = new Set(["que","con","los","del","las","por","para","una","como","más","pero","sus","hay","fue","ser","son","muy","todo","bien","esta","este","soy","voy","vos","sos","nos","les","sin","sobre"]);
  const topWords = Object.entries(s.wordFreq)
    .filter(([w]) => !STOP.has(w) && w.length >= 3 && !/^\d+$/.test(w))
    .sort((a,b) => b[1]-a[1])
    .slice(0, 6)
    .map(([w, c]) => ({ word: w, count: c }));

  // ── Copy-paste ────────────────────────────────────────────────────────────
  const topPaste = Object.entries(s.msgHashes)
    .sort((a,b) => b[1]-a[1])
    .filter(([,c]) => c >= 6)[0];
  const copyPaste = topPaste ? { count: topPaste[1] } : null;

  // ── Overall mood (combines emotes + text + behavior) ─────────────────────
  const moodSignals = { ...moodCounts };
  if (s.posWords > s.negWords * 2)  moodSignals.hype    = (moodSignals.hype    ?? 0) + s.posWords;
  if (s.negWords > s.posWords * 2)  moodSignals.sad     = (moodSignals.sad     ?? 0) + s.negWords;
  if (capsRatio > 0.3)              moodSignals.hype    = (moodSignals.hype    ?? 0) + 5;
  if (isIronic)                     moodSignals.funny   = (moodSignals.funny   ?? 0) + 5;
  if (copyPaste?.count >= 10)       moodSignals.funny   = (moodSignals.funny   ?? 0) + 3;

  const [overallMood] = Object.entries(moodSignals).sort((a,b) => b[1]-a[1])[0] ?? ["unknown"];
  const moodInfo = MOOD_META[overallMood] ?? { label: "Neutro", icon: "💬", color: "#6b7280" };

  // ── Description ───────────────────────────────────────────────────────────
  const description = buildDescription({
    total, topEmotes, emoteMoodBreakdown, textSentiment, isIronic,
    capsRatio, shortRatio, questionRatio, culture, topWords,
    copyPaste, emoteSource, dominantEmoteMood, overallMood,
  });

  return {
    msgCount:     total,
    overallMood:  { mood: overallMood, ...moodInfo },
    topEmotes,
    emoteMoodBreakdown,
    textSentiment,
    isIronic,
    capsRatio:    Math.round(capsRatio * 100),
    shortRatio:   Math.round(shortRatio * 100),
    questionRatio:Math.round(questionRatio * 100),
    culture,
    topWords,
    copyPaste,
    emoteSource:  emoteSource ? { label: emoteSource, kickPct } : null,
    description,
  };
}

function pick(...opts) { return opts[Math.floor(Math.random() * opts.length)]; }

function buildDescription({ total, topEmotes, emoteMoodBreakdown, textSentiment,
  isIronic, capsRatio, shortRatio, questionRatio, culture, topWords,
  copyPaste, emoteSource, dominantEmoteMood, overallMood }) {

  if (total < 30) return `Analizando… ${total} mensajes procesados.`;

  const parts = [];

  // Estado emocional dominante
  const dom = emoteMoodBreakdown[0];
  if (dom && dom.pct >= 40) {
    parts.push(pick(
      `Los emotes del chat gritan que está ${dom.icon} ${dom.label.toLowerCase()} (${dom.pct}% de los emotes lo confirman).`,
      `El uso de emotes es claro: ${dom.pct}% apuntan a que están ${dom.label.toLowerCase()}.`,
      `Mirando los emotes, este chat está principalmente ${dom.label.toLowerCase()} ${dom.icon}.`,
    ));
  } else if (dom && emoteMoodBreakdown[1]) {
    const d2 = emoteMoodBreakdown[1];
    parts.push(`Los emotes muestran una mezcla de ${dom.icon} ${dom.label.toLowerCase()} y ${d2.icon} ${d2.label.toLowerCase()}.`);
  }

  // Top emote con su significado
  if (topEmotes[0]) {
    const top = topEmotes[0];
    parts.push(pick(
      `El emote más usado es ${top.name} (×${top.count}) — lo usan para expresar ${top.meaning}.`,
      `${top.name} domina el chat con ×${top.count} usos: ${top.meaning}.`,
    ));
  }

  // Ironía
  if (isIronic) parts.push(pick(
    "Cuidado con leerlos literal — este chat es muy irónico. Cuando algo falla, explotan con 'genial' y 'increíble'.",
    "Son sarcásticos. Sus elogios suelen ser al revés.",
  ));

  // Sentimiento del texto
  if (textSentiment && Math.abs(textSentiment.score) > 0.2) {
    const label = textSentiment.label;
    parts.push(pick(
      `En texto, el chat suena ${label} — ${textSentiment.positive} palabras positivas vs ${textSentiment.negative} negativas.`,
      `El lenguaje escrito es ${label}.`,
    ));
  }

  // Comportamiento
  if (capsRatio > 0.35) parts.push(pick(
    "Les encanta GRITAR en mayúsculas — un tercio de los mensajes van en caps.",
    "Escriben en MAYÚSCULAS constantemente. Alta energía.",
  ));
  if (shortRatio > 0.6) parts.push("Prefieren reacciones cortas — un emote o una palabra, y listo.");
  if (questionRatio > 0.2) parts.push("Hacen muchas preguntas — están muy atentos y curiosos.");

  // Cultura
  if (culture) {
    const cMap = { argentina:"Es un chat de habla argentina.", mexicana:"Es un chat de habla mexicana.", latina:"Predomina el español latinoamericano.", gamer:"Hablan en términos gamer constantemente." };
    parts.push(cMap[culture]);
  }

  // Vocabulario
  if (topWords.length >= 2) {
    const words = topWords.slice(0,3).map(w => `"${w.word}"`).join(", ");
    parts.push(pick(
      `Sus palabras más repetidas: ${words}.`,
      `El vocabulario más característico de este chat: ${words}.`,
    ));
  }

  // Copy-paste
  if (copyPaste?.count >= 10) parts.push(pick(
    `Tienen un copy-paste que se repitió ×${copyPaste.count} veces. Se contagian fácil.`,
    `El copy-paste activo se repitió ×${copyPaste.count} — este chat se contagia rápido.`,
  ));

  return parts.join(" ") || "Analizando el comportamiento del chat…";
}
