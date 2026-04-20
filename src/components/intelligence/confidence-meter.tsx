import { cn } from "@/lib/utils";

export function ConfidenceMeter({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const tier = v >= 75 ? "high" : v >= 45 ? "medium" : "low";
  const bar =
    tier === "high"
      ? "from-[var(--confidence-high)] to-[var(--brand-accent)]"
      : tier === "medium"
        ? "from-[var(--confidence-medium)] to-[var(--warning)]"
        : "from-[var(--confidence-low)] to-[var(--risk-high)]";

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Confidence level
        </div>
        <div
          className={cn(
            "text-xs font-semibold tabular-nums",
            tier === "high" && "text-[var(--confidence-high)]",
            tier === "medium" && "text-[var(--confidence-medium)]",
            tier === "low" && "text-[var(--confidence-low)]",
          )}
        >
          {v}%
        </div>
      </div>
      <div className="h-2 rounded-full bg-muted/50 ring-1 ring-[var(--brand-secondary)]/25">
        <div className={cn("h-2 rounded-full bg-gradient-to-r", bar)} style={{ width: `${v}%` }} />
      </div>
      <div className="text-[11px] text-muted-foreground">
        {tier === "high" ? "High confidence — signals converge across datasets." : null}
        {tier === "medium" ? "Moderate confidence — validate with uploads and owner review." : null}
        {tier === "low" ? "Low confidence — widen evidence base before executive circulation." : null}
      </div>
    </div>
  );
}
