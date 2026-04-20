"use client";

import * as React from "react";
import { Landmark, Sparkles } from "lucide-react";

import { AnalyticsScopeControls } from "@/components/app/analytics-scope";
import { useWorkspaceData } from "@/components/app/workspace-data-provider";
import { WorkspaceTrustBanner } from "@/components/app/workspace-trust-banner";
import { useAnalyticsScope } from "@/components/app/analytics-scope";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  type DebtStrategy,
  getDemoLoans,
  loanKpis,
  rangeDayCount,
  sortLoansForStrategy,
} from "@/lib/cfo-intelligence";
import { getUploadCostSignals } from "@/lib/cfo-intelligence/upload-integration";
import { formatMoney } from "@/lib/mock/demo";

const STRATEGIES: { id: DebtStrategy; label: string; hint: string }[] = [
  { id: "snowball", label: "Snowball", hint: "Lowest balance first" },
  { id: "avalanche", label: "Avalanche", hint: "Highest rate first" },
  { id: "preservation", label: "Cash preservation", hint: "Lowest payment first" },
];

export default function DebtIntelligencePage() {
  const workspace = useWorkspaceData();
  const { scope } = useAnalyticsScope();
  const [strategy, setStrategy] = React.useState<DebtStrategy>("avalanche");

  const uploadSignals = React.useMemo(() => {
    if (workspace.dataSource !== "upload") return null;
    return getUploadCostSignals({
      entity: workspace.primaryEntity,
      range: scope.range,
      spendRows: workspace.spendForEntity?.kind === "spend" ? workspace.spendForEntity.rows : [],
      payrollRows: workspace.payrollForEntity?.kind === "payroll" ? workspace.payrollForEntity.rows : [],
    });
  }, [
    workspace.dataSource,
    workspace.primaryEntity,
    workspace.spendForEntity,
    workspace.payrollForEntity,
    scope.range,
    workspace.revision,
  ]);

  const loans = React.useMemo(() => getDemoLoans(), []);
  const ordered = React.useMemo(() => sortLoansForStrategy(loans, strategy), [loans, strategy]);
  const kpis = React.useMemo(() => loanKpis(loans), [loans]);

  const insights = React.useMemo(() => {
    const lines: string[] = [];
    const high = loans.filter((l) => l.rateApr >= 8.5);
    if (high.length) {
      lines.push(
        `${high[0].name} carries a higher coupon vs. a ${(5.75).toFixed(2)}% market reference — stress-test covenants before refi.`,
      );
    }
    if (kpis.refinanceMonthlySavings > 1500) {
      lines.push(
        `Modeled refinance spread could free ~${formatMoney(kpis.refinanceMonthlySavings)}/month if spreads tighten 75–125 bps.`,
      );
    }
    const days = rangeDayCount(scope.range);
    const monthlyDisbursementsPace = uploadSignals ? (uploadSignals.spendInRange / days) * 30 : 0;
    const burden = uploadSignals
      ? kpis.monthlyDebtService / Math.max(1, uploadSignals.payrollMonthly + monthlyDisbursementsPace)
      : 0;
    if (uploadSignals && burden > 0.35) {
      lines.push("Debt service is elevated relative to scoped payroll + disbursement pace — keep liquidity buffers visible.");
    } else if (uploadSignals) {
      lines.push("Scoped operating outflows look manageable versus modeled debt service — still monitor revolver utilization.");
    }
    if (loans.some((l) => l.status === "Watch")) {
      lines.push("One facility is on watch — align treasury updates with lender reporting before next certification.");
    }
    lines.push(
      strategy === "snowball"
        ? "Snowball sequencing builds morale wins; pair with tight AP controls so cash leaks do not offset progress."
        : strategy === "avalanche"
          ? "Avalanche minimizes interest paid; confirm no prepayment penalties on bridge tranches before accelerating."
          : "Cash preservation sequencing protects liquidity — ideal when collections or payroll timing is volatile.",
    );
    return lines;
  }, [loans, kpis.refinanceMonthlySavings, kpis.monthlyDebtService, strategy, uploadSignals, scope.range]);

  const currency = "USD";

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-brand-primary">Debt intelligence</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Loan portfolio analytics, strategy sequencing, and refinance signals. Debt ledger columns are not part of
          standard uploads — modeled loans stay illustrative while spend and payroll scope stays grounded in your
          workspace.
        </p>
      </div>

      <WorkspaceTrustBanner />

      {workspace.dataSource === "upload" && (
        <Card className="border-border/70 bg-muted/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">From your uploads (scoped)</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Disbursements (range)</div>
              <div className="mt-1 text-lg font-semibold tabular-nums">
                {uploadSignals ? formatMoney(uploadSignals.spendInRange, currency) : "—"}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Payroll (monthly)</div>
              <div className="mt-1 text-lg font-semibold tabular-nums">
                {uploadSignals ? formatMoney(uploadSignals.payrollMonthly, currency) : "—"}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Risk score (upload)</div>
              <div className="mt-1 text-lg font-semibold tabular-nums">
                {uploadSignals ? `${uploadSignals.forecastRiskScore}` : "—"}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {(
          [
            { label: "Total debt (modeled)", value: formatMoney(kpis.totalDebt, currency) },
            { label: "Monthly debt service", value: formatMoney(kpis.monthlyDebtService, currency) },
            { label: "Avg interest rate", value: `${kpis.avgInterestRate.toFixed(2)}%` },
            { label: "Interest remaining (est.)", value: formatMoney(kpis.interestRemaining, currency) },
            { label: "Refinance savings (modeled)", value: `${formatMoney(kpis.refinanceMonthlySavings, currency)}/mo` },
          ] as const
        ).map((k) => (
          <Card key={k.label} className="border-border/60 transition-colors hover:border-[var(--spendda-blue)]/35">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{k.label}</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold tabular-nums text-foreground">{k.value}</CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/60 lg:col-span-2">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Landmark className="h-4 w-4 text-[var(--spendda-blue)]" />
              Loan table
            </CardTitle>
            <Badge variant="secondary" className="text-xs font-normal">
              Illustrative portfolio
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-wrap gap-2">
              {STRATEGIES.map((s) => (
                <Button
                  key={s.id}
                  type="button"
                  size="sm"
                  variant={strategy === s.id ? "default" : "outline"}
                  className="rounded-full"
                  onClick={() => setStrategy(s.id)}
                >
                  {s.label}
                </Button>
              ))}
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
              Order below reflects <span className="font-medium text-foreground">{STRATEGIES.find((x) => x.id === strategy)?.hint}</span>
              .
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loan</TableHead>
                  <TableHead>Lender</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Payment</TableHead>
                  <TableHead>Maturity</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordered.map((l) => (
                  <TableRow key={l.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{l.name}</TableCell>
                    <TableCell className="text-muted-foreground">{l.lender}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(l.balance, currency)}</TableCell>
                    <TableCell className="text-right tabular-nums">{l.rateApr.toFixed(2)}%</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(l.monthlyPayment, currency)}</TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">{l.maturityIso}</TableCell>
                    <TableCell>
                      <Badge variant={l.status === "Watch" ? "destructive" : "outline"}>{l.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-gradient-to-b from-muted/20 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-[var(--spendda-blue)]" />
              AI-style insights
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-muted-foreground">
            {insights.map((t, i) => (
              <div
                key={i}
                className="rounded-xl border border-border/50 bg-background/60 px-3 py-2.5 leading-relaxed text-foreground/90"
              >
                {t}
              </div>
            ))}
          </CardContent>
        </Card>
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
