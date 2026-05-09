"use client";

import { useCallback, useEffect, useState } from "react";
import {
  subscribe,
  getSnapshot,
  getSavedSession,
  connect as sessionConnect,
  stop as sessionStop,
  reset as sessionReset,
  exportCSV as sessionExport,
  exportXLSX as sessionExportXLSX,
  trackUser as sessionTrackUser,
  refreshChannelInfo as sessionRefresh,
  startWaiting,
  cancelWaiting as sessionCancelWaiting,
} from "@/lib/chatSession";

export function useKickChat() {
  const [state, setState] = useState(getSnapshot);

  useEffect(() => {
    const saved = getSavedSession();
    setState(getSnapshot());
    const unsub = subscribe(() => setState(getSnapshot()));

    const snap = getSnapshot();
    if ((snap.status === "idle" || snap.status === "stopped") && saved?.slug) {
      const target = saved.slug?.startsWith("chatroom-")
        ? saved.slug.replace("chatroom-", "")
        : saved.slug;
      if (!target) { return unsub; }

      // Check if channel is live before auto-reconnecting.
      // If offline → enter waiting mode instead of connecting normally.
      (async () => {
        try {
          const res  = await fetch(`/api/channel/${encodeURIComponent(target)}?fresh=1`);
          const data = await res.json();
          if (res.ok && data?.isLive === false) {
            // Channel is offline — restore waiting mode
            startWaiting(data);
          } else {
            // Online (or check failed) — connect normally
            sessionConnect(target);
          }
        } catch {
          // Network error — try to connect anyway
          sessionConnect(target);
        }
      })();
    }

    return unsub;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const connect            = useCallback((input)    => sessionConnect(input),       []);
  const stop               = useCallback(()         => sessionStop(),               []);
  const cancelWaiting      = useCallback(()         => sessionCancelWaiting(),      []);
  const reset              = useCallback(()         => sessionReset(),              []);
  const exportCSV          = useCallback(()         => sessionExport(),            []);
  const exportXLSX         = useCallback(()         => sessionExportXLSX(),        []);
  const trackUser          = useCallback((username) => sessionTrackUser(username), []);
  const refreshChannelInfo = useCallback(()         => sessionRefresh(),           []);

  return { ...state, connect, stop, cancelWaiting, reset, exportCSV, exportXLSX, trackUser, refreshChannelInfo };
}
