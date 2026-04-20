"use client";

import * as React from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, Sparkles, Wallet } from "lucide-react";

import { SpenddaResponsiveContainer } from "@/components/app/spendda-responsive-container";
import { AnalyticsScopeControls, useAnalyticsScope } from "@/components/app/analytics-scope";
import { useWorkspaceData } from "@/components/app/workspace-data-provider";
import { WorkspaceTrustBanner } from "@/components/app/workspace-trust-banner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { averageMonthlySpendFromSeries, buildCashForecast90d, getDemoLoans, loanKpis } from "@/lib/cfo-intelligence";
import { getUploadCostSignals } from "@/lib/cfo-intelligence/upload-integration";
import { formatMoney } from "@/lib/mock/demo";

export default function CashFlowRadarPage() {
  const workspace = useWorkspaceData();
  const { scope } = useAnalyticsScope();

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
    workspace.revision,
    scope.range,
  ]);

  const debtService = React.useMemo(() => loanKpis(getDemoLoans()).monthlyDebtService, []);

  const burn30 = React.useMemo(() => {
    if (uploadSignals) {
      const avgSpend = averageMonthlySpendFromSeries(uploadSignals.monthlySpendSeries) || uploadSignals.spendInRange;
      return uploadSignals.payrollMonthly + avgSpend + debtService * 0.35;
    }
    return 420_000;
  }, [uploadSignals, debtService]);

  const openingCash = React.useMemo(() => {
    if (uploadSignals) {
      return Math.max(900_000, uploadSignals.payrollMonthly * 10 + uploadSignals.spendInRange * 4);
    }
    return 1_850_000;
  }, [uploadSignals]);

  const dailyNetBurn = React.useMemo(() => Math.max(1200, burn30 / 30), [burn30]);

  const forecast = React.useMemo(
    () =>
      buildCashForecast90d({
        openingCash,
        dailyNetBurn,
        volatility: uploadSignals ? 4200 + uploadSignals.flags30d * 120 : 9000,
      }),
    [openingCash, dailyNetBurn, uploadSignals],
  );

  const runwayMonths = React.useMemo(() => {
    const minCash = Math.min(...forecast.map((p) => p.cash));
    const runway = dailyNetBurn > 0 ? minCash / (dailyNetBurn * 30) : 18;
    return Math.round(runway * 10) / 10;
  }, [forecast, dailyNetBurn]);

  const obligations = React.useMemo(() => {
    const nextPayroll = uploadSignals?.payrollMonthly ?? 210_000;
    const vendor = uploadSignals?.spendInRange ?? 185_000;
    return nextPayroll + vendor * 0.22 + debtService;
  }, [uploadSignals, debtService]);

  const riskScore = React.useMemo(() => {
    if (uploadSignals) {
      return Math.min(94, Math.max(32, Math.round(uploadSignals.forecastRiskScore + (runwayMonths < 4 ? 14 : 0))));
    }
    return runwayMonths < 5 ? 72 : 54;
  }, [uploadSignals, runwayMonths]);

  const alerts = React.useMemo(() => {
    const list: { title: string; severity: "High" | "Medium" | "Low"; detail: string }[] = [];
    list.push({
      title: "Payroll risk next month",
      severity: uploadSignals && uploadSignals.payrollMonthly > burn30 * 0.55 ? "High" : "Medium",
      detail: "Payroll remains the largest fixed outflow in the modeled window — confirm accruals before close.",
    });
    list.push({
      title: "Debt payment pressure",
      severity: debtService > burn30 * 0.25 ? "High" : "Low",
      detail: `Modeled term/amort payments add ~${formatMoney(debtService)} / month on top of operating burn.`,
    });
    list.push({
      title: "Vendor payable spike",
      severity: uploadSignals && uploadSignals.savingsOpportunity30d > 35_000 ? "Medium" : "Low",
      detail: uploadSignals
        ? `Flagged disbursement volume suggests payable volatility of ~${formatMoney(uploadSignals.savingsOpportunity30d)} in-scope.`
        : "No upload-linked spike — monitor three-week rolling disbursements.",
    });
    const dip = forecast.find((p, i) => i > 20 && p.cash < p.floor * 1.05);
    if (dip) {
      list.push({
        title: "Cash dips below internal threshold",
        severity: "High",
        detail: `Projected soft floor approached on ${dip.day} — tighten discretionary spend that week.`,
      });
    }
    return list;
  }, [uploadSignals, burn30, debtService, forecast]);

  const actions = [
    "Delay non-critical spend two weeks to rebuild cushion.",
    "Improve collections: focus top 10 overdue AR buckets with structured cadence.",
    "Refinance highest-coupon tranche if covenants allow — see Debt intelligence.",
    "Reduce overtime in high-variance teams until cash gradient stabilizes.",
  ];

  const chartData = forecast.map((p) => ({ ...p, target: openingCash * 0.22 }));

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-brand-primary">Cash flow risk radar</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Ninety-day projected liquidity, obligation stack, and early warnings. Uploads tune burn and opening cash
          heuristics; debt service blends illustrative term assumptions.
        </p>
      </div>

      <WorkspaceTrustBanner />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {(
          [
            { label: "Cash balance (opening)", value: formatMoney(openingCash) },
            { label: "30-day burn (modeled)", value: formatMoney(burn30) },
            { label: "Runway (months, est.)", value: `${runwayMonths}` },
            { label: "Upcoming obligations (30d)", value: formatMoney(obligations) },
            { label: "Risk score", value: `${riskScore}` },
          ] as const
        ).map((k) => (
          <Card key={k.label} className="border-border/60 transition-colors hover:border-[var(--spendda-blue)]/35">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{k.label}</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold tabular-nums">{k.value}</CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/60 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="h-4 w-4 text-[var(--spendda-blue)]" />
              90-day cash forecast
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[340px] w-full min-w-0">
            <SpenddaResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="cashFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--spendda-blue))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--spendda-blue))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis dataKey="day" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} interval={13} />
                <YAxis
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  tickFormatter={(v) => (v >= 1_000_000 ? `${Math.round(v / 1_000_000)}M` : `${Math.round(v / 1000)}k`)}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12,
                  }}
                />
                <ReferenceLine y={chartData[0]?.floor ?? 0} stroke="#94a3b8" strokeDasharray="5 5" label={{ value: "Floor", fontSize: 10 }} />
                <Area type="monotone" dataKey="cash" stroke="hsl(var(--spendda-blue))" fill="url(#cashFill)" strokeWidth={2} />
                <Line type="monotone" dataKey="target" stroke="#22c55e" dot={false} strokeWidth={1.5} strokeDasharray="4 4" name="Target cushion" />
              </ComposedChart>
            </SpenddaResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-gradient-to-b from-muted/20 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-[var(--spendda-blue)]" />
              AI-style actions
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm text-muted-foreground">
            {actions.map((a, i) => (
              <div key={i} className="rounded-xl border border-border/50 bg-background/60 px-3 py-2 text-foreground/90">
                {a}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {alerts.map((a) => (
            <div
              key={a.title}
              className="rounded-xl border border-border/60 bg-muted/10 px-4 py-3 transition-colors hover:bg-muted/20"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium">{a.title}</div>
                <Badge variant={a.severity === "High" ? "destructive" : a.severity === "Medium" ? "secondary" : "outline"}>
                  {a.severity}
                </Badge>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{a.detail}</p>
            </div>
          ))}
        </CardContent>
      </Card>

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
