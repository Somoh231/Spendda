"use client";

import * as React from "react";
import { Lightbulb } from "lucide-react";

import { AnalyticsScopeControls } from "@/components/app/analytics-scope";
import { useAnalyticsScope } from "@/components/app/analytics-scope";
import { useWorkspaceData } from "@/components/app/workspace-data-provider";
import { WorkspaceTrustBanner } from "@/components/app/workspace-trust-banner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type RecommendationCard, type RecommendationPriority, demoRecommendationCards } from "@/lib/cfo-intelligence";
import { computeUploadDashboardMetrics } from "@/lib/workspace/upload-dashboard-metrics";
import { formatMoney } from "@/lib/mock/demo";

function priorityOrder(p: RecommendationPriority) {
  if (p === "High") return 0;
  if (p === "Medium") return 1;
  return 2;
}

export default function RecommendationsPage() {
  const workspace = useWorkspaceData();
  const { scope } = useAnalyticsScope();

  const uploadCards = React.useMemo((): RecommendationCard[] => {
    if (workspace.dataSource !== "upload") return [];
    const m = computeUploadDashboardMetrics({
      entity: workspace.primaryEntity,
      range: scope.range,
      spendRows: workspace.spendForEntity?.kind === "spend" ? workspace.spendForEntity.rows : [],
      payrollRows: workspace.payrollForEntity?.kind === "payroll" ? workspace.payrollForEntity.rows : [],
    });
    if (!m) return [];
    return m.recentFlags.slice(0, 8).map((f, idx) => ({
      id: `upload-${f.id}-${idx}`,
      title: f.title,
      impactEstimate: f.amount ? `${formatMoney(f.amount)} in-scope` : "Review amount in Transactions",
      priority: f.severity,
      category: "Upload signal",
      nextAction: "Open the flagged transaction or payroll row and attach an owner with a due date.",
    }));
  }, [
    workspace.dataSource,
    workspace.primaryEntity,
    workspace.spendForEntity,
    workspace.payrollForEntity,
    scope.range,
    workspace.revision,
  ]);

  const cards = React.useMemo(() => {
    const demo = demoRecommendationCards();
    const merged = [...uploadCards, ...demo];
    const seen = new Set<string>();
    const dedup: RecommendationCard[] = [];
    for (const c of merged) {
      const key = c.title.slice(0, 48);
      if (seen.has(key)) continue;
      seen.add(key);
      dedup.push(c);
    }
    return dedup.sort((a, b) => priorityOrder(a.priority) - priorityOrder(b.priority));
  }, [uploadCards]);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-brand-primary">Smart recommendations</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Prioritized actions blending live upload signals with modeled CFO playbooks. Nothing here changes your
          underlying data — it is an action layer for review.
        </p>
      </div>

      <WorkspaceTrustBanner />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => (
          <Card
            key={c.id}
            className="group border-border/60 transition-all hover:-translate-y-0.5 hover:border-[var(--spendda-blue)]/40 hover:shadow-lg hover:shadow-black/20"
          >
            <CardHeader className="space-y-2 pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-base font-semibold leading-snug">
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[var(--spendda-blue)] opacity-90 group-hover:opacity-100" />
                  {c.title}
                </CardTitle>
                <Badge variant={c.priority === "High" ? "destructive" : c.priority === "Medium" ? "secondary" : "outline"}>
                  {c.priority}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline" className="font-normal">
                  {c.category}
                </Badge>
                <span className="rounded-full bg-muted/50 px-2 py-0.5 text-muted-foreground">Impact: {c.impactEstimate}</span>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Suggested next step</div>
              <p className="mt-1.5 leading-relaxed text-foreground/90">{c.nextAction}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scope</CardTitle>
        </CardHeader>
        <CardContent>
          <AnalyticsScopeControls label="Date range & entities" />
        </CardContent>
      </Card>
    </div>
  );
}
