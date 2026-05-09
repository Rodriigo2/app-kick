"use client";

import { useEffect, useState } from "react";
import { subscribeToasts, getToasts, removeToast } from "@/lib/toasts";

const TYPE_STYLES = {
  "gift-bomb": "border-purple-500/50 bg-purple-950/90",
  combo:       "border-kick-green/50 bg-black/90",
  hype:        "border-orange-500/50 bg-orange-950/90",
  sub:         "border-kick-green/40 bg-black/90",
  info:        "border-kick-border bg-black/90",
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState(getToasts);

  useEffect(() => subscribeToasts(setToasts), []);

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col-reverse gap-2 w-72">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-2xl backdrop-blur-sm transition-all ${TYPE_STYLES[t.type] ?? TYPE_STYLES.info}`}
        >
          {t.icon && <span className="text-xl shrink-0 leading-none mt-0.5">{t.icon}</span>}
          <div className="min-w-0 flex-1">
            {t.title   && <div className="text-sm font-semibold text-neutral-100">{t.title}</div>}
            {t.message && <div className="text-xs text-neutral-400 mt-0.5">{t.message}</div>}
          </div>
          <button
            onClick={() => removeToast(t.id)}
            className="shrink-0 text-neutral-600 hover:text-neutral-300 text-xs leading-none mt-0.5"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
