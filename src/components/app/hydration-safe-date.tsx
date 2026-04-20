"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type Props = {
  iso: string;
  mode?: "date" | "datetime";
  className?: string;
};

/** Avoids locale/timezone SSR/client mismatches for formatted dates. */
export function HydrationSafeDate({ iso, mode = "date", className }: Props) {
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <span className={cn("inline-block min-w-[7ch] tabular-nums text-muted-foreground", className)} suppressHydrationWarning>
        …
      </span>
    );
  }

  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return <span className={className}>—</span>;
  }

  const text =
    mode === "datetime"
      ? d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
      : d.toLocaleDateString(undefined, { dateStyle: "medium" });

  return <span className={className}>{text}</span>;
}
