"use client";

import * as React from "react";

import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function SwitchRow({
  title,
  description,
  checked,
  onCheckedChange,
  disabled,
  className,
}: {
  title: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/15 px-4 py-3 shadow-sm transition-colors",
        checked ? "ring-1 ring-[var(--brand-primary)]/25" : "",
        disabled ? "opacity-60" : "hover:bg-muted/25",
        className,
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-sm font-semibold">{title}</div>
          <Badge
            variant="outline"
            className={cn(
              "h-5 px-2 text-[10px] font-semibold uppercase tracking-[0.12em]",
              checked
                ? "border-[var(--brand-primary)]/35 bg-[var(--brand-primary)]/15 text-brand-primary"
                : "border-border/60 bg-background/30 text-muted-foreground",
            )}
          >
            {checked ? "ON" : "OFF"}
          </Badge>
        </div>
        {description ? <div className="mt-1 text-xs text-muted-foreground">{description}</div> : null}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}

