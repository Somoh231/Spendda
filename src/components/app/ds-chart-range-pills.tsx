import * as React from "react";

import { cn } from "@/lib/utils";

export type ChartRangePreset = "7d" | "30d" | "90d" | "YTD";

const OPTIONS: ChartRangePreset[] = ["7d", "30d", "90d", "YTD"];

type DsChartRangePillsProps = {
  value: ChartRangePreset;
  onChange: (v: ChartRangePreset) => void;
  className?: string;
};

/** Segmented range control from Spendda app UI kit (Dashboard.jsx) */
export function DsChartRangePills({ value, onChange, className }: DsChartRangePillsProps) {
  return (
    <div
      className={cn(
        "ds-chart-segment flex w-fit flex-wrap gap-1 rounded-full border border-border/60 bg-muted/40 p-1 text-xs",
        className,
      )}
      role="tablist"
      aria-label="Chart range"
    >
      {OPTIONS.map((t) => {
        const active = value === t;
        return (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t)}
            className={cn(
              "rounded-full px-2.5 py-1 font-medium transition-colors",
              active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t}
          </button>
        );
      })}
    </div>
  );
}
