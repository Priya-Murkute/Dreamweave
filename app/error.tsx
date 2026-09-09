"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex max-w-[700px] flex-col items-center gap-8 px-6 py-24 text-center">
      <h1 className="font-pixel m-0 text-[16px]" style={{ color: "#ef4444" }}>
        THE WEAVE UNRAVELLED
      </h1>
      <p style={{ margin: 0, color: "var(--text-soft)" }}>
        Something broke while rendering this page. The error has been logged.
      </p>
      <button type="button" className="pixel-button" onClick={reset}>
        TRY AGAIN
      </button>
    </main>
  );
}
