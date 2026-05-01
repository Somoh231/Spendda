"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowRight, Gauge, TrendingDown, Users } from "lucide-react";

import { SpenddaResponsiveContainer } from "@/components/app/spendda-responsive-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/mock/demo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateRangePicker, type DateRange } from "@/components/ui/date-range-picker";
import { EntityMultiSelect } from "@/components/app/entity-multi-select";
import { useProfile } from "@/lib/profile/client";
import { WorkspaceTrustBanner } from "@/components/app/workspace-trust-banner";
import { useWorkspaceData } from "@/components/app/workspace-data-provider";
import { useAnalyticsScope } from "@/components/app/analytics-scope";
import { buildUploadForecastPayload } from "@/lib/workspace/upload-forecast";

type ForecastResponse = {
  org: { currency: string };
  forecast: {
    spendVariance: { month: string; value: number }[];
    payrollGrowth: { month: string; value: number }[];
    cards: {
      budgetShortfall: number;
      retirementWavePct: number;
      payrollGrowthPct: number;
      overspendRiskScore: number;
    };
  };
};

export default function ForecastingPage() {
  const router = useRouter();
  const { profile } = useProfile();
  const workspace = useWorkspaceData();
  const [demoData, setDemoData] = React.useState<ForecastResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [hiringPlan, setHiringPlan] = React.useState(12);
  const [overtimeDeltaPct, setOvertimeDeltaPct] = React.useState(8);
  const { scope, options, setEntities, setRange } = useAnalyticsScope();
  const range = scope.range;

  React.useEffect(() => {
    if (workspace.dataSource === "upload") {
      setDemoData(null);
      setError(null);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const url = new URL("/api/demo/forecast", window.location.origin);
        if (range.from) url.searchParams.set("from", range.from);
        if (range.to) url.searchParams.set("to", range.to);
        if (scope.entities.length) url.searchParams.set("entities", scope.entities.join(","));
        const res = await fetch(url.toString(), { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as ForecastResponse;
        if (!alive) return;
        setDemoData(json);
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Failed to load forecast");
      }
    })();
    return () => {
      alive = false;
    };
  }, [scope.entities, range.from, range.to, workspace.revision, workspace.dataSource]);

  const uploadForecast = React.useMemo(() => {
    if (workspace.dataSource !== "upload") return null;
    return buildUploadForecastPayload({
      entity: workspace.primaryEntity,
      range,
      spendDataset: workspace.spendForEntity,
      payrollDataset: workspace.payrollForEntity,
    });
  }, [
    workspace.dataSource,
    workspace.primaryEntity,
    workspace.spendForEntity,
    workspace.payrollForEntity,
    workspace.revision,
    range.from,
    range.to,
  ]);

  const data = uploadForecast ?? demoData;
  const fromUpload = Boolean(uploadForecast);

  const formatVarianceAxis = React.useCallback((v: number) => {
    const n = Number(v);
    const a = Math.abs(n);
    if (a >= 1_000_000) return `${Math.round(n / 1_000_000)}M`;
    if (a >= 10_000) return `${Math.round(n / 1000)}K`;
    return `${Math.round(n)}`;
  }, []);

  const cards = data?.forecast.cards;
  const currency = data?.org.currency || "USD";
  const scenario = React.useMemo(() => {
    const baseShortfall = cards?.budgetShortfall ?? 0;
    const hiringCost = hiringPlan * 4200;
    const overtimeCost = Math.round(baseShortfall * (overtimeDeltaPct / 100) * 0.18);
    const modeled = Math.max(0, baseShortfall + hiringCost + overtimeCost);
    const confidence = fromUpload ? 0.82 : cards ? 0.78 : 0.72;
    return { modeled, hiringCost, overtimeCost, confidence };
  }, [cards, hiringPlan, overtimeDeltaPct, fromUpload]);

  return (
    <div className="grid gap-6">
      <WorkspaceTrustBanner />
      {fromUpload ? (
        <p className="text-xs text-muted-foreground">
          Charts and headline cards below are derived from your uploaded spend/payroll rows (pilot heuristics). Scenario sliders still apply on top of
          upload-based shortfall.
        </p>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="app-page-title">Forecasting</div>
          <div className="app-page-desc">
            Budget pressure, payroll projection, and scenario modeling for executive decisions.
          </div>
          {error ? (
            <div className="mt-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              Forecast failed to load: {error}
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-xl shadow-sm" onClick={() => router.push("/app/reports")}>
            Export pack <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button variant="secondary" className="rounded-xl shadow-sm" onClick={() => router.push("/app/alerts")}>
            Open alerts <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Analytics scope</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <DateRangePicker value={range} onChange={setRange} />
            <div className="grid gap-2">
              <Label>Entity scope</Label>
              <EntityMultiSelect
                options={options}
                value={scope.entities}
                onChange={setEntities}
                placeholder="All entities"
              />
              <p className="text-xs text-muted-foreground">
                {fromUpload
                  ? "Upload mode: spend series uses dated rows in this range; payroll % uses average increase fields when present."
                  : "Forecast recomputes from the scoped transaction history in demo mode."}
              </p>
            </div>
          </CardContent>
        </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              Budget shortfall
            </CardTitle>
            {fromUpload ? (
              <Badge variant="outline" className="mt-1 w-fit text-[10px]">
                Upload model
              </Badge>
            ) : null}
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-semibold tracking-tight">
                {cards ? formatMoney(cards.budgetShortfall, currency) : "—"}
              </div>
              <Badge variant="destructive">High risk</Badge>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {fromUpload ? "Heuristic: flagged-line exposure in your file (not audited)." : "At current pace, pressure begins in Q4."}
            </div>
          </CardContent>
        </Card>
        {!fromUpload ? (
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground">
                Retirement wave
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-semibold tracking-tight">
                  {cards
                    ? `${cards.retirementWavePct.toFixed(1)}%`
                    : "—"}
                </div>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Projected eligible retirements in 12 months.
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground">
                Payroll ratio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-semibold tracking-tight">
                  {cards
                    ? `${Math.min(99, Math.round(cards.payrollGrowthPct * 12))}%`
                    : "—"}
                </div>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Payroll as % of total spend in range.
                Target varies by industry — home care
                aim for under 60%.
              </div>
            </CardContent>
          </Card>
        )}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              Payroll growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-semibold tracking-tight">
                {cards ? `+${cards.payrollGrowthPct.toFixed(1)}%` : "—"}
              </div>
              <TrendingDown className="h-4 w-4 rotate-180 text-accent" />
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {fromUpload ? "From average salary increase % when column is mapped." : "Predicted monthly growth by October."}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              Overspend risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-semibold tracking-tight">
                {cards ? `${cards.overspendRiskScore}/100` : "—"}
              </div>
              <Gauge className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {fromUpload ? "Same risk score engine as dashboard upload KPIs." : "Departments to monitor: Operations, Health."}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="border-border/60 shadow-md lg:col-span-7">
          <CardHeader>
            <CardTitle className="text-base">Budget variance projection</CardTitle>
            {fromUpload ? (
              <Badge variant="outline" className="mt-1 w-fit text-[10px] sm:mt-0">
                Month-over-month Δ spend
              </Badge>
            ) : null}
          </CardHeader>
          <CardContent className="h-[320px] min-w-0">
            {!data ? (
              <div className="grid h-full place-items-center">
                <Skeleton className="h-56 w-full" />
              </div>
            ) : fromUpload && data.forecast.spendVariance.length === 0 ? (
              <div className="grid h-full place-items-center px-4 text-center text-sm text-muted-foreground">
                No dated spend rows in this range, so month-over-month variance cannot be plotted. Widen the date range or
                upload spend with transaction dates.
              </div>
            ) : (
              <SpenddaResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data.forecast.spendVariance.map((p) => ({
                    month: p.month,
                    variance: p.value,
                  }))}
                  margin={{ left: 8, right: 8 }}
                >
                  <defs>
                    <linearGradient id="varianceFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.28} />
                      <stop offset="55%" stopColor="hsl(var(--destructive))" stopOpacity={0.08} />
                      <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0.01} />
                    </linearGradient>
                    <filter id="varianceGlow" x="-30%" y="-30%" width="160%" height="160%">
                      <feGaussianBlur stdDeviation="6" result="blur" />
                      <feColorMatrix
                        in="blur"
                        type="matrix"
                        values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.30 0"
                      />
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => formatVarianceAxis(Number(v))}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value) => formatMoney(Number(value), currency)}
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 12,
                    }}
                    cursor={{ stroke: "hsl(var(--destructive))", strokeOpacity: 0.22, strokeWidth: 1 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="variance"
                    stroke="hsl(var(--destructive))"
                    fill="url(#varianceFill)"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{
                      r: 4.5,
                      strokeWidth: 2,
                      stroke: "hsl(var(--background))",
                      fill: "hsl(var(--destructive))",
                    }}
                    filter="url(#varianceGlow)"
                  />
                </AreaChart>
              </SpenddaResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-md lg:col-span-5">
          <CardHeader>
            <CardTitle className="text-base">Payroll growth forecast</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px] min-w-0">
            {!data ? (
              <div className="grid h-full place-items-center">
                <Skeleton className="h-56 w-full" />
              </div>
            ) : fromUpload && data.forecast.payrollGrowth.length === 0 ? (
              <div className="grid h-full place-items-center px-4 text-center text-sm text-muted-foreground">
                No monthly spend buckets in range, so payroll growth cannot be aligned to a timeline. Upload payroll with
                salary fields and ensure spend has dates for shared months.
              </div>
            ) : (
              <SpenddaResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data.forecast.payrollGrowth.map((p) => ({
                    month: p.month,
                    growth: p.value,
                  }))}
                  margin={{ left: 8, right: 8 }}
                >
                  <defs>
                    <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.28} />
                      <stop offset="55%" stopColor="hsl(var(--accent))" stopOpacity={0.08} />
                      <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0.01} />
                    </linearGradient>
                    <filter id="growthGlow" x="-30%" y="-30%" width="160%" height="160%">
                      <feGaussianBlur stdDeviation="6" result="blur" />
                      <feColorMatrix
                        in="blur"
                        type="matrix"
                        values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.24 0"
                      />
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value) => `${Number(value).toFixed(1)}%`}
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 12,
                    }}
                    cursor={{ stroke: "hsl(var(--accent))", strokeOpacity: 0.22, strokeWidth: 1 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="growth"
                    stroke="hsl(var(--accent))"
                    fill="url(#growthFill)"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{
                      r: 4.5,
                      strokeWidth: 2,
                      stroke: "hsl(var(--background))",
                      fill: "hsl(var(--accent))",
                    }}
                    filter="url(#growthGlow)"
                  />
                </AreaChart>
              </SpenddaResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-sm lg:col-span-2">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">Hiring cost scenario model</CardTitle>
            <Badge variant="outline">Confidence: {Math.round(scenario.confidence * 100)}%</Badge>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="hiring">Planned hires (next 90 days)</Label>
                <Input
                  id="hiring"
                  type="number"
                  value={hiringPlan}
                  onChange={(e) => setHiringPlan(Math.max(0, Number(e.target.value || 0)))}
                />
                <div className="text-xs text-muted-foreground">
                  Assumption: ~{formatMoney(4200, currency)} fully-loaded cost per hire/month.
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ot">Overtime change (%)</Label>
                <Input
                  id="ot"
                  type="number"
                  value={overtimeDeltaPct}
                  onChange={(e) => setOvertimeDeltaPct(Number(e.target.value || 0))}
                />
                <div className="text-xs text-muted-foreground">
                  Model adjusts shortfall sensitivity based on overtime trend.
                </div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { label: "Hiring impact", value: formatMoney(scenario.hiringCost, currency) },
                { label: "Overtime impact", value: formatMoney(scenario.overtimeCost, currency) },
                { label: "Modeled shortfall", value: formatMoney(scenario.modeled, currency) },
              ].map((x) => (
                <div key={x.label} className="rounded-2xl border bg-background p-4 shadow-sm">
                  <div className="text-xs text-muted-foreground">{x.label}</div>
                  <div className="mt-2 text-xl font-semibold tracking-tight">{x.value}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="rounded-xl" onClick={() => router.push("/app/ai-workspace")}>
                Open AI Workspace <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="secondary" className="rounded-xl" onClick={() => router.push("/app/benchmarks")}>
                Compare entities <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Action center</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {(fromUpload
              ? [
                  {
                    k: "Review flagged transactions",
                    v: "Check anomalies from your upload",
                  },
                  {
                    k: "Upload prior month for comparison",
                    v: "Enables month-over-month trending",
                  },
                  {
                    k: "Generate monthly report",
                    v: "Export findings as PDF",
                  },
                ]
              : [
                  {
                    k: "Reforecast Q4 hiring plan",
                    v: "Scenario model + CFO brief",
                  },
                  {
                    k: "Freeze approvals in Operations",
                    v: "Pending evidence packets",
                  },
                  {
                    k: "Reduce overtime in Nursing",
                    v: "Projected rise in 3 weeks",
                  },
                ]
            ).map((x) => (
              <div key={x.k} className="rounded-2xl border bg-background p-4 shadow-sm">
                <div className="text-sm font-semibold">{x.k}</div>
                <div className="mt-2 text-xs text-muted-foreground">{x.v}</div>
                <div className="mt-3">
                  <Button size="sm" variant="outline" className="rounded-lg" onClick={() => router.push("/app/alerts")}>
                    Open <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

