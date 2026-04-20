"use client";

import * as React from "react";
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Percent, Sparkles } from "lucide-react";

import { SpenddaResponsiveContainer } from "@/components/app/spendda-responsive-container";
import { AnalyticsScopeControls, useAnalyticsScope } from "@/components/app/analytics-scope";
import { useWorkspaceData } from "@/components/app/workspace-data-provider";
import { WorkspaceTrustBanner } from "@/components/app/workspace-trust-banner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  buildProfitabilityScenario,
  demoProfitabilityBaseline,
  profitabilityTrendSeries,
} from "@/lib/cfo-intelligence";
import { getUploadCostSignals } from "@/lib/cfo-intelligence/upload-integration";
import { formatMoney } from "@/lib/mock/demo";

function ScenarioSlider({
  id,
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (n: number) => void;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
          {label}
        </Label>
        <span className="text-xs tabular-nums text-foreground">
          {value}
          {suffix}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer accent-[var(--spendda-blue)]"
      />
    </div>
  );
}

export default function ProfitabilityPage() {
  const workspace = useWorkspaceData();
  const { scope } = useAnalyticsScope();
  const [revenuePct, setRevenuePct] = React.useState(0);
  const [payrollCutPct, setPayrollCutPct] = React.useState(0);
  const [vendorCutPct, setVendorCutPct] = React.useState(0);
  const [newStaffMonthly, setNewStaffMonthly] = React.useState(0);
  const [priceLiftPct, setPriceLiftPct] = React.useState(0);

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

  const base = React.useMemo(() => {
    const d = demoProfitabilityBaseline();
    if (uploadSignals) {
      return {
        ...d,
        annualVendorSpend: Math.max(d.annualVendorSpend * 0.35, uploadSignals.annualizedVendorSpend),
        annualPayroll: Math.max(d.annualPayroll * 0.4, uploadSignals.payrollMonthly * 12),
      };
    }
    return d;
  }, [uploadSignals]);

  const scenario = React.useMemo(
    () =>
      buildProfitabilityScenario(base, {
        revenuePct,
        payrollCutPct,
        vendorCutPct,
        newStaffMonthly,
        priceLiftPct,
      }),
    [base, revenuePct, payrollCutPct, vendorCutPct, newStaffMonthly, priceLiftPct],
  );

  const chartData = React.useMemo(() => {
    const series = profitabilityTrendSeries();
    if (!uploadSignals) return series.map((r) => ({ ...r, breakEven: Math.round(scenario.breakEvenRevenue / 12) }));
    const scale = uploadSignals.spendInRange > 0 ? uploadSignals.spendInRange / Math.max(1, series[series.length - 1].expense) : 1;
    return series.map((r) => ({
      month: r.month,
      revenue: Math.round(r.revenue * scale * 1.08),
      expense: Math.round(r.expense * scale),
      marginPct: r.marginPct,
      breakEven: Math.round(scenario.breakEvenRevenue / 12),
    }));
  }, [uploadSignals, scenario.breakEvenRevenue]);

  const aiLines = React.useMemo(() => {
    const out: string[] = [];
    if (scenario.profitTargetGap > 0) {
      out.push(
        `Gap to a ${formatMoney(scenario.profitTarget)} annual profit target is about ${formatMoney(Math.max(0, scenario.profitTargetGap))} at current levers.`,
      );
    } else {
      out.push(`Modeled profit exceeds the ${formatMoney(scenario.profitTarget)} target — stress-test assumptions before locking plans.`);
    }
    if (payrollCutPct > 0) {
      out.push(`Payroll reduction of ${payrollCutPct}% improves modeled net margin by roughly ${(payrollCutPct * 0.35).toFixed(1)} pts at this revenue level.`);
    }
    if (scenario.marginPct < 8) {
      out.push("Margin sits below an 8% guardrail on this baseline — prioritize price, mix, or vendor renegotiation before adding capacity.");
    }
    if (uploadSignals && uploadSignals.flags30d > 12) {
      out.push("Upload anomaly density is elevated — leakage in disbursements may be masking true margin.");
    }
    return out;
  }, [scenario, payrollCutPct, uploadSignals]);

  const currency = "USD";

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-brand-primary">Profitability & break-even</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Scenario lab for revenue, payroll, vendor spend, and pricing. Uploads anchor the expense side to your scoped
          ledger; revenue and fixed overhead layers remain modeled unless you extend ingestion.
        </p>
      </div>

      <WorkspaceTrustBanner />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(
          [
            { label: "Revenue (modeled)", value: formatMoney(scenario.revenue, currency) },
            { label: "Gross profit (modeled)", value: formatMoney(scenario.grossProfit, currency) },
            { label: "Net profit (modeled)", value: formatMoney(scenario.net, currency) },
            { label: "Margin %", value: `${scenario.marginPct.toFixed(1)}%` },
            { label: "Break-even revenue", value: formatMoney(scenario.breakEvenRevenue, currency) },
            { label: "Profit target gap", value: formatMoney(scenario.profitTargetGap, currency) },
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
              <Percent className="h-4 w-4 text-[var(--spendda-blue)]" />
              Scenario simulator
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <ScenarioSlider
              id="rev"
              label="Increase revenue %"
              value={revenuePct}
              min={-15}
              max={25}
              step={1}
              suffix="%"
              onChange={setRevenuePct}
            />
            <ScenarioSlider
              id="pay"
              label="Reduce payroll %"
              value={payrollCutPct}
              min={0}
              max={20}
              step={1}
              suffix="%"
              onChange={setPayrollCutPct}
            />
            <ScenarioSlider
              id="ven"
              label="Reduce vendor spend %"
              value={vendorCutPct}
              min={0}
              max={25}
              step={1}
              suffix="%"
              onChange={setVendorCutPct}
            />
            <ScenarioSlider
              id="staff"
              label="Add new staff cost (monthly)"
              value={newStaffMonthly}
              min={0}
              max={80_000}
              step={1000}
              suffix="$"
              onChange={setNewStaffMonthly}
            />
            <div className="sm:col-span-2">
              <ScenarioSlider
                id="price"
                label="Raise prices %"
                value={priceLiftPct}
                min={0}
                max={12}
                step={0.5}
                suffix="%"
                onChange={setPriceLiftPct}
              />
            </div>
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
            {aiLines.map((t, i) => (
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

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Revenue vs. expense & margin</CardTitle>
        </CardHeader>
        <CardContent className="h-[320px] w-full min-w-0">
          <SpenddaResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
              <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <YAxis
                yAxisId="left"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                tickFormatter={(v) => (Math.abs(v) >= 1_000_000 ? `${Math.round(v / 1_000_000)}M` : `${Math.round(v / 1000)}k`)}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 12,
                }}
              />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
              <Line yAxisId="left" type="monotone" dataKey="expense" name="Expense" stroke="#f97316" dot={false} strokeWidth={2} />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="marginPct"
                name="Margin %"
                stroke="hsl(var(--spendda-blue))"
                dot={false}
                strokeWidth={2}
              />
              <ReferenceLine
                yAxisId="left"
                y={chartData[0]?.breakEven ?? 0}
                stroke="#94a3b8"
                strokeDasharray="4 4"
                label={{ value: "Break-even (monthly)", fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              />
            </ComposedChart>
          </SpenddaResponsiveContainer>
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
