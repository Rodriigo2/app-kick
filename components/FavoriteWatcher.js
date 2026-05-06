"use client";

import { useEffect, useRef, useState } from "react";
import { getFavorite, setFavorite, clearFavorite } from "@/lib/favoriteChannel";

const POLL_MS = 60_000; // check every 60 seconds

export function useFavoriteWatcher({ status, channelInfo, onConnect, onStop }) {
  const [favorite, setFavoriteState] = useState(() => getFavorite());
  const wasLiveRef  = useRef(false);
  const timerRef    = useRef(null);

  const saveFavorite = (slug) => {
    setFavorite(slug);
    setFavoriteState(slug);
  };

  const removeFavorite = () => {
    clearFavorite();
    setFavoriteState(null);
  };

  // Poll the favorite channel for live status
  useEffect(() => {
    if (!favorite) return;

    const check = async () => {
      try {
        const res  = await fetch(`/api/channel/${encodeURIComponent(favorite)}?fresh=1`);
        if (!res.ok) return;
        const data = await res.json();
        const isLive = Boolean(data?.isLive);

        // Transition: offline → live
        if (isLive && !wasLiveRef.current) {
          wasLiveRef.current = true;
          const currentSlug  = channelInfo?.slug;

          // If monitoring a different channel, stop it first
          if (status === "connected" && currentSlug && currentSlug !== favorite) {
            onStop();
            await new Promise((r) => setTimeout(r, 500));
          }

          // Only auto-connect if not already on the favorite channel
          if (currentSlug !== favorite) {
            onConnect(favorite);
          }
        }

        if (!isLive) wasLiveRef.current = false;
      } catch {}
    };

    // Check immediately, then on interval
    check();
    timerRef.current = setInterval(check, POLL_MS);
    return () => clearInterval(timerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favorite]);

  return { favorite, saveFavorite, removeFavorite };
}
