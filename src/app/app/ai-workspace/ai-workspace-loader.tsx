"use client";

import dynamic from "next/dynamic";

export const AiWorkspaceShellLazy = dynamic(
  () => import("./ai-workspace-app").then((m) => ({ default: m.AiWorkspaceApp })),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 py-16 text-sm text-muted-foreground">
        <div
          className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent"
          aria-hidden
        />
        Loading AI Workspace…
      </div>
    ),
  },
);
