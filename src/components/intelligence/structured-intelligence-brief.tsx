import type { ReactNode } from "react";
import type { IntelligenceBrief } from "@/lib/intelligence/brief";
import { ConfidenceMeter } from "./confidence-meter";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--brand-secondary)]/30 bg-background/60 p-4 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--brand-primary)]">
        {title}
      </div>
      <div className="mt-3 text-xs leading-6 text-muted-foreground">{children}</div>
    </div>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="mt-2 grid list-none gap-2">
      {items.map((x) => (
        <li key={x} className="flex gap-2 text-xs leading-6 text-muted-foreground">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand-primary)]" />
          <span>{x}</span>
        </li>
      ))}
    </ul>
  );
}

function Numbered({ items }: { items: string[] }) {
  return (
    <ol className="mt-2 grid list-decimal gap-2 pl-4 text-xs leading-6 text-muted-foreground">
      {items.map((x) => (
        <li key={x}>{x}</li>
      ))}
    </ol>
  );
}

export function StructuredIntelligenceBrief({ brief }: { brief: IntelligenceBrief }) {
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--brand-primary)]/25 bg-gradient-to-r from-[var(--brand-primary)]/10 via-transparent to-[var(--brand-accent)]/10 px-4 py-3">
        <div className="text-xs text-muted-foreground">
          Snapshot <span className="font-mono text-foreground">{brief.snapshotId}</span>
        </div>
        <div className="text-xs text-muted-foreground">
          Signals used: <span className="font-semibold text-foreground">{brief.signalsUsed}</span>
        </div>
      </div>

      <Section title="Risk summary">
        <Bullets items={brief.riskSummary} />
      </Section>

      <Section title="Financial exposure">
        <Bullets
          items={[
            `Estimated exposure: ${brief.financialExposure.estimatedExposure}`,
            `Concentration risk: ${brief.financialExposure.concentrationRisk}`,
            `Variance vs baseline: ${brief.financialExposure.varianceVsBaseline}`,
          ]}
        />
      </Section>

      <Section title="Root cause signals">
        <Bullets items={brief.rootCauseSignals} />
      </Section>

      <Section title="Why this was flagged">
        <Bullets items={brief.whyFlagged} />
      </Section>

      <Section title="Recommended actions">
        <Numbered items={brief.recommendedActions} />
      </Section>

      <div className="rounded-2xl border border-[var(--brand-primary)]/20 bg-muted/20 p-4">
        <ConfidenceMeter value={brief.confidencePct} />
      </div>
    </div>
  );
}
