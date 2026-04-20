"use client";

import * as React from "react";
import { ArrowRightLeft } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { SpenddaResponsiveContainer } from "@/components/app/spendda-responsive-container";
import { WorkspaceTrustBanner } from "@/components/app/workspace-trust-banner";
import { useWorkspaceData } from "@/components/app/workspace-data-provider";
import { useProfile } from "@/lib/profile/client";
import { useClientSession } from "@/hooks/use-client-session";
import { getUploadedInsight } from "@/lib/upload/storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { DateRangePicker, type DateRange } from "@/components/ui/date-range-picker";
import { EntityMultiSelect } from "@/components/app/entity-multi-select";
import { useAnalyticsScope } from "@/components/app/analytics-scope";
import { buildUploadBenchmarkSummary, type UploadBenchmarkSummary } from "@/lib/workspace/upload-benchmark-summary";

type Summary = {
  source: "upload" | "demo";
  deptSpend30d: Array<{ department: string; spend: number }>;
  monthlySpend24m: Array<{ month: string; spend: number }>;
};

type SummaryApi = {
  summary?: {
    departmentSpend30d?: Array<{ department: string; value: number }>;
    monthlySpend?: Array<{ month: string; value: number }>;
  };
};

export default function BenchmarksPage() {
  const { profile } = useProfile();
  const { client } = useClientSession();
  const clientId = client?.clientId ?? null;
  const workspace = useWorkspaceData();
  const [mounted, setMounted] = React.useState(false);
  const [demoSummary, setDemoSummary] = React.useState<Summary | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [lhs, setLhs] = React.useState<string>("HQ");
  const [rhs, setRhs] = React.useState<string>("Region A");
  const { scope, options, setEntities, setRange } = useAnalyticsScope();
  const range = scope.range;

  React.useEffect(() => {
    setMounted(true);
    if (profile) {
      setLhs(profile.entities[0] || "HQ");
      setRhs(profile.entities[1] || profile.entities[0] || "HQ");
    }
  }, [profile]);

  const uploadSummary = React.useMemo((): Summary | null => {
    if (workspace.dataSource !== "upload") return null;
    const built = buildUploadBenchmarkSummary({
      datasets: workspace.datasets,
      scopeEntities: scope.entities,
      profileEntities: profile?.entities,
      primaryEntity: workspace.primaryEntity,
      range,
    });
    if (!built) return null;
    const u: UploadBenchmarkSummary = built;
    return {
      source: "upload",
      deptSpend30d: u.deptSpend30d,
      monthlySpend24m: u.monthlySpend24m,
    };
  }, [
    workspace.dataSource,
    workspace.datasets,
    workspace.primaryEntity,
    workspace.revision,
    scope.entities,
    range.from,
    range.to,
    profile?.entities,
  ]);

  React.useEffect(() => {
    if (workspace.dataSource === "upload") {
      setDemoSummary(null);
      setLoadError(null);
      return;
    }
    let alive = true;
    (async () => {
      try {
        setLoadError(null);
        const url = new URL("/api/demo/summary", window.location.origin);
        if (range.from) url.searchParams.set("from", range.from);
        if (range.to) url.searchParams.set("to", range.to);
        if (scope.entities.length) url.searchParams.set("entities", scope.entities.join(","));
        const res = await fetch(url.toString(), { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as SummaryApi;
        if (!alive) return;
        const dept = json.summary?.departmentSpend30d || [];
        const months = json.summary?.monthlySpend || [];
        setDemoSummary({
          source: "demo",
          deptSpend30d: dept.map((d) => ({ department: d.department, spend: d.value })),
          monthlySpend24m: months.map((m) => ({ month: m.month, spend: m.value })),
        });
      } catch (e) {
        if (!alive) return;
        setLoadError(e instanceof Error ? e.message : "Failed to load benchmarks");
        setDemoSummary({ source: "demo", deptSpend30d: [], monthlySpend24m: [] });
      }
    })();
    return () => {
      alive = false;
    };
  }, [workspace.dataSource, scope.entities, range.from, range.to, workspace.revision]);

  const summary = workspace.dataSource === "upload" ? uploadSummary : demoSummary;

  const label = profile?.orgType === "University" ? "Campuses" : profile?.orgType === "Bank" ? "Branches" : "Entities";
  const lhsSpend = mounted ? getUploadedInsight(lhs, "spend", clientId) : null;
  const rhsSpend = mounted ? getUploadedInsight(rhs, "spend", clientId) : null;
  const lhsPayroll = mounted ? getUploadedInsight(lhs, "payroll", clientId) : null;
  const rhsPayroll = mounted ? getUploadedInsight(rhs, "payroll", clientId) : null;
  const lhsSpendTotal = lhsSpend?.kind === "spend" ? lhsSpend.totalSpend : null;
  const rhsSpendTotal = rhsSpend?.kind === "spend" ? rhsSpend.totalSpend : null;
  const lhsTopVendor = lhsSpend?.kind === "spend" ? lhsSpend.topVendor : null;
  const lhsHighRisk = lhsPayroll?.kind === "payroll" ? lhsPayroll.highRisk : null;
  const rhsHighRisk = rhsPayroll?.kind === "payroll" ? rhsPayroll.highRisk : null;

  const clinicalRows = React.useMemo(() => {
    if (!summary?.deptSpend30d?.length) return [];
    const sorted = [...summary.deptSpend30d].sort((a, b) => b.spend - a.spend);
    const median = sorted[Math.floor(sorted.length / 2)]?.spend || 1;
    const pick = sorted.slice(0, 3);
    const fromUpload = summary.source === "upload";
    const drivers = fromUpload
      ? (["Largest share of scoped spend", "Above median in this view", "Review flagged lines in Alerts"] as const)
      : (["Vendor concentration", "Payroll overtime pressure", "Grant / program mix shift"] as const);
    return pick.map((d, i) => {
      const delta = Math.round(((d.spend - median) / Math.max(1, median)) * 100);
      const risk = delta > 12 ? "High" : delta > 6 ? "Medium" : "Low";
      return {
        name: d.department,
        delta,
        driver: drivers[i % drivers.length],
        risk,
        fromUpload,
      };
    });
  }, [summary]);

  return (
    <div className="grid gap-6">
      <WorkspaceTrustBanner />
      {workspace.dataSource === "upload" ? (
        <p className="text-xs text-muted-foreground">
          Department and monthly series below are derived from your uploads and analytics scope. Entity cards still use per-entity upload insights; clinical copy is an internal median benchmark (not an external peer index).
        </p>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="app-page-title">Benchmarks</h1>
          <p className="app-page-desc">
            Compare performance across {label.toLowerCase()}, departments, and periods.
          </p>
          {loadError ? (
            <div className="mt-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              Could not load benchmark data: {loadError}
            </div>
          ) : null}
        </div>
        <Badge variant="outline">
          <ArrowRightLeft className="mr-1.5 h-3.5 w-3.5" />
          Compare
        </Badge>
      </div>

      <Card className="border-border/60 shadow-md">
        <CardHeader>
          <CardTitle className="text-base font-semibold">{label} comparison</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-3 lg:grid-cols-12">
            <Card className="border-border/60 shadow-sm lg:col-span-7">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Analytics scope</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <DateRangePicker value={range} onChange={setRange} />
                <div className="grid gap-2">
                  <div className="text-sm font-semibold">Entity scope</div>
                  <EntityMultiSelect
                    options={options}
                    value={scope.entities}
                    onChange={setEntities}
                    placeholder="All entities"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <div className="text-xs text-muted-foreground">Left</div>
              <Select value={lhs} onValueChange={(v) => v && setLhs(v)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select entity" />
                </SelectTrigger>
                <SelectContent>
                  {(profile?.entities || ["HQ", "Region A", "Region B"]).map((e) => (
                    <SelectItem key={e} value={e}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <div className="text-xs text-muted-foreground">Right</div>
              <Select value={rhs} onValueChange={(v) => v && setRhs(v)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select entity" />
                </SelectTrigger>
                <SelectContent>
                  {(profile?.entities || ["HQ", "Region A", "Region B"]).map((e) => (
                    <SelectItem key={e} value={e}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {!summary ? (
            <Skeleton className="h-36 w-full" />
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                {
                  k: "Spend (L / R)",
                  v:
                    typeof lhsSpendTotal === "number" && typeof rhsSpendTotal === "number"
                      ? `${Math.round(lhsSpendTotal / 1000)}K / ${Math.round(rhsSpendTotal / 1000)}K`
                      : "Upload spend per entity to compare",
                },
                {
                  k: "Payroll risk (High)",
                  v:
                    typeof lhsHighRisk === "number" && typeof rhsHighRisk === "number"
                      ? `${lhsHighRisk} / ${rhsHighRisk}`
                      : "Upload payroll per entity to compare",
                },
                {
                  k: "Top vendor (L)",
                  v: lhsTopVendor || "—",
                },
              ].map((x) => (
                <div key={x.k} className="rounded-xl border bg-background p-4 shadow-sm">
                  <div className="text-xs text-muted-foreground">{x.k}</div>
                  <div className="mt-2 text-lg font-semibold tracking-tight">{x.v}</div>
                </div>
              ))}
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            Tips: switch the active entity in the top bar before uploading spend/payroll for that entity. Benchmarks will compare the latest uploaded insights per entity.
          </div>
        </CardContent>
      </Card>

      {summary?.source === "upload" && (summary.monthlySpend24m?.length ?? 0) >= 2 ? (
        <Card className="border-border/60 shadow-md">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
            <CardTitle className="text-base font-semibold">Monthly spend (uploads)</CardTitle>
            <Badge variant="secondary" className="text-[10px]">
              Scoped rollup
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="h-[220px] w-full min-w-0">
              <SpenddaResponsiveContainer width="100%" height="100%" initialDimension={{ width: 560, height: 220 }}>
                <LineChart data={summary.monthlySpend24m} margin={{ left: 4, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(Number(v) / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(v) => [`$${Number(v).toLocaleString()}`, "Spend"]}
                    contentStyle={{
                      background: "hsl(var(--card) / 0.98)",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 12,
                    }}
                  />
                  <Line type="monotone" dataKey="spend" name="Spend" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </SpenddaResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-border/60 shadow-md">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base font-semibold">
            {summary?.source === "upload" ? "Department benchmark (uploads)" : "Peer intelligence (clinical)"}
          </CardTitle>
          {summary?.source === "upload" ? (
            <Badge variant="outline" className="text-[10px]">
              Your data
            </Badge>
          ) : null}
        </CardHeader>
        <CardContent className="grid gap-3">
          {!clinicalRows.length ? (
            summary ? (
              <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
                No department spend rows available for comparison in this snapshot.
              </div>
            ) : (
              <Skeleton className="h-28 w-full" />
            )
          ) : (
            clinicalRows.map((r) => (
              <div key={r.name} className="rounded-2xl border border-[var(--brand-secondary)]/25 bg-background p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold">{r.name}</div>
                  <Badge variant={r.risk === "High" ? "destructive" : r.risk === "Medium" ? "warning" : "outline"}>
                    Risk: {r.risk}
                  </Badge>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {r.delta >= 0 ? "+" : ""}
                  {r.delta}% vs{" "}
                  {r.fromUpload
                    ? "median in uploaded scope"
                    : `peer median • Percentile modeled at p${r.delta > 10 ? "78" : "62"}`}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {summary?.source === "upload" ? "Signal: " : "Variance driver: "}
                  <span className="font-medium text-foreground">{r.driver}</span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

