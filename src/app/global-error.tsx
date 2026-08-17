"use client";

import * as React from "react";

/**
 * Only fires when the root layout itself throws — everything else is
 * caught by error.tsx. Can't use any app components here since the
 * layout that would provide them is exactly what failed; keep this
 * self-contained and dependency-free on purpose.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "1.5rem",
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#faf7f2",
          color: "#1a1a1a",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Something went wrong</h1>
        <p style={{ color: "#6b6b6b", fontSize: "0.9375rem" }}>Please try reloading the page.</p>
        <button
          onClick={reset}
          style={{
            padding: "0.625rem 1.25rem",
            borderRadius: "0.5rem",
            background: "#ba4e1c",
            color: "#fff",
            fontWeight: 500,
            border: "none",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
