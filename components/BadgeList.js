"use client";

import { useEffect, useState } from "react";

// Global cache shared across all BadgeList instances.
let _badgeCache = null; // null = not fetched yet, {} = fetched (may be empty)
let _fetchPromise = null;
const _listeners = new Set();

function useBadgeUrls(chatroomId) {
  const [urls, setUrls] = useState(_badgeCache ?? {});

  useEffect(() => {
    if (_badgeCache !== null) { setUrls(_badgeCache); return; }
    if (!chatroomId) return;

    const cb = (v) => setUrls(v);
    _listeners.add(cb);

    if (!_fetchPromise) {
      _fetchPromise = fetch(`/api/badges?chatroomId=${chatroomId}`)
        .then((r) => r.ok ? r.json() : { badges: {} })
        .then(({ badges }) => {
          _badgeCache = badges ?? {};
          _listeners.forEach((fn) => fn(_badgeCache));
          _listeners.clear();
        })
        .catch(() => {
          _badgeCache = {};
          _listeners.forEach((fn) => fn({}));
          _listeners.clear();
        });
    }

    return () => _listeners.delete(cb);
  }, [chatroomId]);

  return urls;
}

// Local SVG fallback paths (used when real CDN URL not yet fetched).
const LOCAL_BADGES = {
  broadcaster:      { file: "broadcaster",  title: "Channel Host"      },
  moderator:        { file: "moderator",    title: "Moderador"         },
  global_moderator: { file: "moderator",    title: "Global Moderator"  },
  global_mod:       { file: "moderator",    title: "Global Moderator"  },
  admin:            { file: "moderator",    title: "Global Admin"      },
  global_admin:     { file: "moderator",    title: "Global Admin"      },
  vip:              { file: "vip",          title: "VIP"               },
  og:               { file: "og",           title: "OG"                },
  founder:          { file: "founder",      title: "Founder"           },
  verified:         { file: "verified",     title: "Verificado"        },
  staff:            { file: "staff",        title: "Staff Kick"        },
  sub_gifter:       { file: "sub_gifter",   title: "Gifter"            },
  sidekick:         { file: "sub_gifter",   title: "Sidekick"          },
};

function resolveSubBadge(months, subscriberBadges) {
  if (!subscriberBadges?.length) return null;
  let best = null;
  for (const b of subscriberBadges) {
    if (b.months <= (months ?? 1)) best = b;
  }
  return (best ?? subscriberBadges[0])?.url ?? null;
}

const BADGE_SIZE = "h-[18px] w-[18px] rounded-[3px] object-contain align-middle";

export default function BadgeList({ badges = [], subscriberBadges = [], chatroomId = null }) {
  const remoteUrls = useBadgeUrls(chatroomId);

  if (!badges.length) return null;

  return (
    <span className="inline-flex shrink-0 items-center gap-0.5 align-middle">
      {badges.map((badge, i) => {
        if (badge.type === "subscriber") {
          const url = resolveSubBadge(badge.count, subscriberBadges);
          return url ? (
            <img key={i} src={url} alt={badge.text ?? "Suscriptor"}
              title={`Suscriptor ${badge.count ?? 1}m`}
              className={`inline-block ${BADGE_SIZE}`} loading="lazy" />
          ) : null;
        }

        // Use real Kick URL if fetched, else fall back to local SVG.
        const remoteUrl = remoteUrls?.[badge.type];
        const local     = LOCAL_BADGES[badge.type];
        const src       = remoteUrl ?? (local ? `/badges/${local.file}.svg` : null);
        const title     = local?.title ?? badge.text ?? badge.type;

        return src ? (
          <img key={i} src={src} alt={title} title={title}
            className={`inline-block ${BADGE_SIZE}`} loading="lazy" />
        ) : null;
      })}
    </span>
  );
}
