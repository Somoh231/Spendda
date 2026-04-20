"use client";

import * as React from "react";
import Link from "next/link";
import { Globe2 } from "lucide-react";

import { WorkspaceTrustBanner } from "@/components/app/workspace-trust-banner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  deriveClientRelevanceContext,
  type ExternalUpdate,
  getRelevantExternalUpdates,
} from "@/lib/external-intelligence";
import { useProfile } from "@/lib/profile/client";

const CATEGORY_LABEL: Record<ExternalUpdate["category"], string> = {
  interest_rates: "Interest rates",
  treasury: "Treasury / Fed",
  wage_law: "Wage law",
  tax: "Tax",
  childcare: "Childcare / daycare",
  inflation: "Inflation",
  lending: "Lending environment",
  sector_policy: "Sector policy",
};

function badgeUrgency(u: ExternalUpdate["urgency"]) {
  if (u === "Critical" || u === "High") return "destructive" as const;
  if (u === "Medium") return "secondary" as const;
  return "outline" as const;
}

export default function MarketUpdatesPage() {
  const { profile } = useProfile();
  const items = React.useMemo(() => getRelevantExternalUpdates(profile ?? null), [profile]);
  const ctx = React.useMemo(() => deriveClientRelevanceContext(profile ?? null), [profile]);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-brand-primary">Market & regulatory updates</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          External intelligence layered on top of your internal analytics. Updates are filtered by organization type,
          market, size, sector (from your demo pack when applicable), and stated goals — not a live wire service in
          this build.
        </p>
      </div>

      <WorkspaceTrustBanner />

      {ctx ? (
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe2 className="h-4 w-4 text-[var(--spendda-blue)]" />
              Active relevance profile
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">{ctx.orgType}</Badge>
            <Badge variant="outline">{ctx.marketType}</Badge>
            <Badge variant="outline">{ctx.orgSize}</Badge>
            <Badge variant="secondary">Industry: {ctx.industrySegment}</Badge>
            <Badge variant="secondary">Location: {ctx.operatingLocation}</Badge>
            <Badge variant="outline">Sector (demo pack): {ctx.sector}</Badge>
            <span className="w-full pt-1 text-[11px]">
              Regulatory regions union: {ctx.regions.join(", ")} · Goals matched when feed items require them.
            </span>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4">
        {items.map((u) => (
          <Card key={u.id} className="border-border/60 transition-colors hover:border-[var(--spendda-blue)]/25">
            <CardHeader className="space-y-2 pb-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="font-normal">
                  {CATEGORY_LABEL[u.category]}
                </Badge>
                <Badge variant={badgeUrgency(u.urgency)}>{u.urgency}</Badge>
                <Badge variant="secondary" className="font-normal">
                  Confidence: {u.confidence}
                </Badge>
                <span className="text-xs text-muted-foreground">{u.asOfLabel}</span>
              </div>
              <CardTitle className="text-base leading-snug">{u.headline}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Why it matters</div>
                <p className="mt-1 leading-relaxed text-foreground/90">{u.whyItMatters}</p>
              </div>
              <Separator />
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recommended action</div>
                <p className="mt-1 font-medium leading-relaxed text-foreground">{u.recommendedAction}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Need deeper debt or cash scenarios?{" "}
        <Link href="/app/debt" className="font-medium text-[var(--spendda-blue)] hover:underline">
          Debt intelligence
        </Link>{" "}
        ·{" "}
        <Link href="/app/cashflow" className="font-medium text-[var(--spendda-blue)] hover:underline">
          Cash flow radar
        </Link>
      </p>
    </div>
  );
}
