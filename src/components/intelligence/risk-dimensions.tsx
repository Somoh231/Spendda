import { cn } from "@/lib/utils";

export type RiskDimensionScores = {
  operational: number;
  financial: number;
  fraud: number;
  compliance: number;
};

function Row({ label, value, color }: { label: string; value: number; color: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-foreground">{label}</span>
        <span className="tabular-nums text-muted-foreground">{v}/100</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-muted/40 ring-1 ring-[var(--brand-secondary)]/20">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}

export function RiskDimensionsPanel({ scores }: { scores: RiskDimensionScores }) {
  return (
    <div className="grid gap-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        Multi-dimensional risk model
      </div>
      <Row label="Operational risk" value={scores.operational} color="bg-[var(--brand-primary)]" />
      <Row label="Financial risk" value={scores.financial} color="bg-[var(--risk-medium)]" />
      <Row label="Fraud risk" value={scores.fraud} color="bg-[var(--risk-high)]" />
      <Row label="Compliance risk" value={scores.compliance} color="bg-[var(--brand-accent)]" />
      <div className="text-[11px] leading-5 text-muted-foreground">
        Weighted from oversight signals, exception volume, payroll integrity markers, and documentation completeness.
      </div>
    </div>
  );
}
