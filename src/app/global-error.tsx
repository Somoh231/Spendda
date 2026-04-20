"use client";

import * as React from "react";

import "./globals.css";
import { devError } from "@/lib/dev-log";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    devError("[Spendda] global error", error);
  }, [error]);

  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col items-center justify-center gap-4 bg-background px-6 py-12 text-center text-foreground">
        <h1 className="text-lg font-semibold tracking-tight">Spendda needs a refresh</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          {error.message || "A critical error occurred. Reload the page to continue."}
        </p>
        {error.digest ? (
          <p className="max-w-md font-mono text-[10px] text-muted-foreground/80">Reference: {error.digest}</p>
        ) : null}
        <button
          type="button"
          className="rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold shadow-sm transition hover:bg-muted"
          onClick={() => reset()}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
