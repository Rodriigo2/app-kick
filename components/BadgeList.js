"use client";

// Pick the highest tier subscriber badge whose month threshold ≤ user months.
function resolveSubBadge(months, subscriberBadges) {
  if (!subscriberBadges?.length) return null;
  let best = null;
  for (const b of subscriberBadges) {
    if (b.months <= (months ?? 1)) best = b;
  }
  return (best ?? subscriberBadges[0])?.url ?? null;
}

// Global badge definitions — served as static SVGs from /public/badges/.
const GLOBAL_BADGES = {
  moderator:   { file: "moderator",   title: "Moderador"  },
  vip:         { file: "vip",         title: "VIP"        },
  og:          { file: "og",          title: "OG"         },
  broadcaster: { file: "broadcaster", title: "Streamer"   },
  verified:    { file: "verified",    title: "Verificado" },
  staff:       { file: "staff",       title: "Staff Kick" },
  founder:     { file: "founder",     title: "Fundador"   },
  sub_gifter:  { file: "sub_gifter",  title: "Gifter"     },
};

const BADGE_SIZE = "h-[18px] w-[18px] rounded-[3px] object-contain align-middle";

export default function BadgeList({ badges = [], subscriberBadges = [] }) {
  if (!badges.length) return null;

  return (
    <span className="inline-flex shrink-0 items-center gap-0.5 align-middle">
      {badges.map((badge, i) => {
        // ── Subscriber badge (channel-specific image from Kick CDN) ──────────
        if (badge.type === "subscriber") {
          const url = resolveSubBadge(badge.count, subscriberBadges);
          return url ? (
            <img
              key={i}
              src={url}
              alt={badge.text ?? "Suscriptor"}
              title={`Suscriptor ${badge.count ?? 1}m`}
              className={`inline-block ${BADGE_SIZE}`}
              loading="lazy"
            />
          ) : null;
        }

        // ── Global Kick badge (static SVG) ───────────────────────────────────
        const def = GLOBAL_BADGES[badge.type];
        if (def) {
          return (
            <img
              key={i}
              src={`/badges/${def.file}.svg`}
              alt={def.title}
              title={def.title}
              className={`inline-block ${BADGE_SIZE}`}
              loading="lazy"
            />
          );
        }

        return null;
      })}
    </span>
  );
}
