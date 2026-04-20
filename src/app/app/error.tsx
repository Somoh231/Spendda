"use client";

import * as React from "react";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { devError } from "@/lib/dev-log";

export default function AppSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    devError("[Spendda] app route error", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 py-12 text-center">
      <h2 className="text-lg font-semibold tracking-tight">This page hit a snag</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        {error.message || "We couldn’t finish loading this screen. Your session and data are unchanged—try again or go back to the dashboard."}
      </p>
      {error.digest ? (
        <p className="max-w-md font-mono text-[10px] text-muted-foreground/80">Reference: {error.digest}</p>
      ) : null}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button type="button" onClick={() => reset()}>
          Try again
        </Button>
        <Link href="/app/ai-workspace" className={cn(buttonVariants({ variant: "outline" }))}>
          AI Workspace
        </Link>
      </div>
    </div>
  );
}
