import * as React from "react";

import { cn } from "@/lib/utils";

export type DsSectionHeaderProps = {
  eyebrow?: string;
  title: string;
  sub?: string;
  action?: React.ReactNode;
  className?: string;
};

/** App kit section title row — matches `design/from-zip/ui_kits/app/Dashboard.jsx` SectionHeader */
export function DsSectionHeader({ eyebrow, title, sub, action, className }: DsSectionHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4", className)}>
      <div className="min-w-0 flex-1">
        {eyebrow ? (
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{eyebrow}</div>
        ) : null}
        <h2 className="mt-1.5 text-lg font-semibold leading-snug tracking-tight text-foreground sm:mt-2 sm:text-xl">
          {title}
        </h2>
        {sub ? <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:mt-2">{sub}</p> : null}
      </div>
      {action ? <div className="shrink-0 pt-0.5 sm:pt-1">{action}</div> : null}
    </div>
  );
}
