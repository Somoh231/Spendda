"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Globe2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { type ExternalUpdate, getRelevantExternalUpdates } from "@/lib/external-intelligence";
import { useProfile } from "@/lib/profile/client";

const CATEGORY_LABEL: Record<ExternalUpdate["category"], string> = {
  interest_rates: "Rates",
  treasury: "Treasury",
  wage_law: "Wage law",
  tax: "Tax",
  childcare: "Childcare",
  inflation: "Inflation",
  lending: "Lending",
  sector_policy: "Sector policy",
};

function urgencyVariant(u: ExternalUpdate["urgency"]) {
  if (u === "Critical" || u === "High") return "destructive" as const;
  if (u === "Medium") return "secondary" as const;
  return "outline" as const;
}

function confidenceLabel(c: ExternalUpdate["confidence"]) {
  if (c === "High") return "High confidence";
  if (c === "Medium") return "Medium confidence";
  return "Directional";
}

export function MarketRegulatoryWidget({ compact = true }: { compact?: boolean }) {
  const { profile } = useProfile();
  const items = React.useMemo(
    () => getRelevantExternalUpdates(profile ?? null).slice(0, compact ? 3 : 8),
    [profile, compact],
  );

  if (!items.length) return null;

  return (
    <Card className="border-border/60 shadow-md lg:col-span-12">
      <CardHeader className="flex flex-col gap-2 pb-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe2 className="h-4 w-4 text-[var(--spendda-blue)]" aria-hidden />
            Market & regulatory updates
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            External intelligence filtered by your organization profile (industry proxy, market, size, and goals).
            Curated briefing — replace with live feeds in production.
          </p>
        </div>
        <Link
          href="/app/market-updates"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0 border-[var(--brand-primary)]/25")}
        >
          View all
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Link>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">
        {items.map((u) => (
          <div
            key={u.id}
            className="rounded-2xl border border-border/60 bg-muted/10 p-4 transition-colors hover:border-[var(--spendda-blue)]/30 hover:bg-muted/20"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-[10px] font-normal">
                {CATEGORY_LABEL[u.category]}
              </Badge>
              <Badge variant={urgencyVariant(u.urgency)} className="text-[10px]">
                {u.urgency}
              </Badge>
              <span className="text-[10px] text-muted-foreground">{confidenceLabel(u.confidence)}</span>
            </div>
            <div className="mt-2 text-sm font-semibold leading-snug text-foreground">{u.headline}</div>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground line-clamp-3">{u.whyItMatters}</p>
            <p className="mt-2 text-xs font-medium text-foreground/90">{u.recommendedAction}</p>
            <div className="mt-2 text-[10px] text-muted-foreground">{u.asOfLabel}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
