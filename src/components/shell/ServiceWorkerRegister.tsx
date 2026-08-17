"use client";

import * as React from "react";

/** Production only — a service worker in dev fights HMR by design. */
export function ServiceWorkerRegister() {
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Offline shell is a nice-to-have, not load-bearing — a failed
      // registration should never surface to the user.
    });
  }, []);

  return null;
}
