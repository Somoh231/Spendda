"use client";

import { Database, FlaskConical, Lock, Sparkles } from "lucide-react";

import { useWorkspaceData } from "@/components/app/workspace-data-provider";
import { cn } from "@/lib/utils";

export function WorkspaceTrustBanner() {
  const workspace = useWorkspaceData();
  if (!workspace.ready) return null;

  const mode = workspace.dataSource;

  return (
    <div
      role="status"
      className={cn(
        "rounded-xl border px-4 py-3 text-sm motion-safe:transition-[border-color,box-shadow,background-color] motion-safe:duration-300 motion-safe:ease-out",
        mode === "upload"
          ? "border-[var(--spendda-green)]/35 bg-[var(--spendda-green)]/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
          : mode === "demo"
            ? "border-amber-500/35 bg-amber-500/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
            : "border-border/60 bg-muted/30",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 font-semibold text-foreground">
            {mode === "upload" ? (
              <Sparkles className="h-4 w-4 shrink-0 text-[var(--spendda-green)]" aria-hidden />
            ) : mode === "demo" ? (
              <FlaskConical className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
            ) : (
              <Database className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            )}
            <span>
              {mode === "upload"
                ? "Live workspace data"
                : mode === "demo"
                  ? "Demo mode"
                  : "Awaiting upload for this entity"}
            </span>
          </div>
          <div className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            Entity <span className="font-medium text-foreground">{workspace.primaryEntity}</span>
            {workspace.activeDatasetLabel ? (
              <>
                {" "}
                · Active files <span className="font-medium text-foreground">{workspace.activeDatasetLabel}</span>
              </>
            ) : null}
            {mode === "demo" ? (
              <span> · Charts may blend labeled demo APIs with your profile until you connect uploads.</span>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border/50 bg-background/60 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          <Lock className="h-3 w-3 text-primary/80" aria-hidden />
          Tenant-scoped
        </div>
      </div>
    </div>
  );
}
