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
} from "@/lib/chatSession";

export function useKickChat() {
  const [state, setState] = useState(getSnapshot);

  useEffect(() => {
    // getSavedSession() triggers restoreIfNeeded() + ensurePersistSetup() in browser context.
    const saved = getSavedSession();

    setState(getSnapshot());
    const unsub = subscribe(() => setState(getSnapshot()));

    const snap = getSnapshot();
    if (snap.status === "idle" || snap.status === "stopped") {
      if (saved) {
        const target = saved.slug?.startsWith("chatroom-")
          ? saved.slug.replace("chatroom-", "")
          : saved.slug;
        if (target) sessionConnect(target);
      }
    }

    return unsub;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const connect            = useCallback((input)    => sessionConnect(input),       []);
  const stop               = useCallback(()         => sessionStop(),               []);
  const reset              = useCallback(()         => sessionReset(),              []);
  const exportCSV          = useCallback(()         => sessionExport(),             []);
  const exportXLSX         = useCallback(()         => sessionExportXLSX(),         []);
  const trackUser          = useCallback((username) => sessionTrackUser(username),  []);
  const refreshChannelInfo = useCallback(()         => sessionRefresh(),            []);

  return { ...state, connect, stop, reset, exportCSV, exportXLSX, trackUser, refreshChannelInfo };
}
