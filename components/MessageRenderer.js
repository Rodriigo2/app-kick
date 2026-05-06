"use client";

const KICK_EMOTE_RE = /\[emote:(\d+):([^\]]+)\]/g;
const KICK_IMG      = (id) => `https://files.kick.com/emotes/${id}/fullsize`;
const MAX_TOKEN_LEN = 80;
const URL_RE        = /^https?:\/\/\S+/i;


export default function MessageRenderer({ content, emoteMap = {} }) {
  if (!content) return null;

  const parts = [];

  // 1 — extract Kick built-in emotes first
  KICK_EMOTE_RE.lastIndex = 0;
  const segments = [];
  let match;
  while ((match = KICK_EMOTE_RE.exec(content)) !== null) {
    const [full, id, name] = match;
    segments.push({ start: match.index, end: match.index + full.length, id, name, type: "kick" });
  }

  // 2 — walk through content splitting plain-text regions
  let pos = 0;
  for (const seg of segments) {
    if (pos < seg.start) pushPlainText(content.slice(pos, seg.start), emoteMap, parts);
    parts.push(
      <img
        key={`k-${seg.id}-${seg.start}`}
        src={KICK_IMG(seg.id)}
        alt={seg.name}
        title={seg.name}
        className="inline-block h-6 w-auto align-middle"
        loading="lazy"
      />
    );
    pos = seg.end;
  }
  if (pos < content.length) pushPlainText(content.slice(pos), emoteMap, parts);

  return <span>{parts}</span>;
}

function pushPlainText(text, emoteMap, parts) {
  if (!text) return;

  const tokens = text.split(/(\s+)/);
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    const key = `s-${i}-${parts.length}`;

    // Whitespace — keep as-is
    if (/^\s+$/.test(tok)) {
      parts.push(<span key={key}>{tok}</span>);
      continue;
    }

    // URL — render as clickable link
    if (URL_RE.test(tok)) {
      parts.push(
        <a
          key={key}
          href={tok}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all text-white underline decoration-white/50 hover:decoration-white"
          onClick={(e) => e.stopPropagation()}
        >
          {tok}
        </a>
      );
      continue;
    }

    // 7TV / channel emote
    const emoteUrl = emoteMap[tok];
    if (emoteUrl) {
      parts.push(
        <img
          key={key}
          src={emoteUrl}
          alt={tok}
          title={tok}
          className="inline-block h-6 w-auto align-middle"
          loading="lazy"
        />
      );
      continue;
    }

    // Plain text
    const safeTok = tok.length > MAX_TOKEN_LEN ? tok.slice(0, MAX_TOKEN_LEN) + "…" : tok;
    parts.push(<span key={key}>{safeTok}</span>);
  }
}
