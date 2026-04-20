"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  FileDown,
  ShieldAlert,
  Sparkles,
  Upload,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { SpenddaResponsiveContainer } from "@/components/app/spendda-responsive-container";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useProfile } from "@/lib/profile/client";
import { entityNavLabel, orgSignalsForType } from "@/lib/profile/org-adaptation";
import { portfolioHealthScoreParts } from "@/lib/reports/health-score";
import { formatMoney } from "@/lib/mock/demo";
import { cn } from "@/lib/utils";
import { getUploadedInsights, type UploadedInsights } from "@/lib/upload/storage";
import { RiskDimensionsPanel, type RiskDimensionScores } from "@/components/intelligence/risk-dimensions";
import { MiniSparkline } from "@/components/app/mini-sparkline";
import { useAnimatedNumber } from "@/hooks/use-animated-number";
import { useClientSession } from "@/hooks/use-client-session";
import { EntityMultiSelect } from "@/components/app/entity-multi-select";
import { DateRangePicker, type DateRange } from "@/components/ui/date-range-picker";
import { useAnalyticsScope } from "@/components/app/analytics-scope";
import { MarketRegulatoryWidget } from "@/components/app/market-regulatory-widget";
import { WorkspaceTrustBanner } from "@/components/app/workspace-trust-banner";
import { ProductEmptyState } from "@/components/app/product-empty-state";
import { SpenddaVsExcelStrip } from "@/components/app/spendda-vs-excel-strip";
import { DsChartRangePills, type ChartRangePreset } from "@/components/app/ds-chart-range-pills";
import { DsSectionHeader } from "@/components/app/ds-section-header";
import { useWorkspaceData } from "@/components/app/workspace-data-provider";
import { WORKSPACE_DATA_CHANGED } from "@/lib/workspace/workspace-events";
import { computeUploadDashboardMetrics } from "@/lib/workspace/upload-dashboard-metrics";
import {
  buildDashboardWelcomeHeadline,
  dashboardLastVisitStorageKey,
} from "@/lib/dashboard/welcome-headline";

type SummaryResponse = {
  org: { currency: string };
  summary: {
    kpis: {
      totalSpend30d: number;
      payrollMonthly: number;
      flags30d: number;
      savingsOpportunity30d: number;
      forecastRiskScore: number;
    };
    monthlySpend: { month: string; value: number }[];
    departmentSpend30d: { department: string; value: number }[];
    riskBreakdown30d: { name: "Low" | "Medium" | "High"; value: number }[];
    recentFlags: {
      id: string;
      title: string;
      severity: "Low" | "Medium" | "High";
      entity: string;
      amount?: number;
    }[];
    notes?: string[];
  };
  generatedAt?: string;
};

type InsightsAlertSnapshot = { duplicateCount: number; p95: number; aboveP95: number };

type MlSummaryResponse = {
  org: { currency: string };
  summary: {
    generatedAt: string;
    confidencePct: number;
    anomalies: { total: number; byKind: Record<string, number>; top: Array<{ title: string; severity: string; confidencePct: number; explain: string[] }> };
    risk: { topVendors: Array<{ label: string; riskScore: number; confidencePct: number }>; topDepartments: Array<{ label: string; riskScore: number; confidencePct: number }> };
    forecast: { points: Array<{ month: string; projected: number; lower: number; upper: number; confidencePct: number }> };
    comparison: { ruleFlags30d: number; mlAnomalies30d: number; overlapEstimate: number };
  };
};

function kpiFormat(value: number, currency: string) {
  return formatMoney(value, currency);
}

function AnimatedMoney({ value, currency }: { value: number; currency: string }) {
  const n = useAnimatedNumber(value);
  if (n == null) return <>—</>;
  return <>{formatMoney(n, currency)}</>;
}

function SeverityBadge({ severity }: { severity: "Low" | "Medium" | "High" }) {
  const variant = severity === "High" ? "destructive" : severity === "Medium" ? "secondary" : "outline";
  return <Badge variant={variant}>{severity}</Badge>;
}

function TrendPill({ deltaPct }: { deltaPct: number }) {
  const up = deltaPct >= 0;
  const tone = up
    ? "border-[hsl(var(--success))]/25 bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] dark:text-emerald-200"
    : "border-destructive/25 bg-destructive/10 text-destructive dark:text-rose-200";
  const text = `${up ? "+" : ""}${deltaPct.toFixed(1)}%`;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold tabular-nums ${tone}`}>
      {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {text}
    </span>
  );
}

function KpiDeltaBadge({ text, up }: { text: string; up: boolean }) {
  const tone = up
    ? "border-[hsl(var(--success))]/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
    : "border-destructive/25 bg-rose-500/10 text-rose-700 dark:text-rose-200";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold tabular-nums ${tone}`}>
      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {text}
    </span>
  );
}

type KpiIconName = "wallet" | "users" | "alert" | "activity" | "shield" | "percent";

type KpiTile = {
  label: string;
  value: string;
  hint: string;
  trend: number;
  icon?: KpiIconName;
  trendOverride?: string;
};

function KpiLucide({ name }: { name?: KpiIconName }) {
  const cls = "h-4 w-4";
  switch (name) {
    case "users":
      return <Users className={cls} />;
    case "alert":
      return <AlertTriangle className={cls} />;
    case "activity":
      return <Activity className={cls} />;
    case "shield":
      return <ShieldAlert className={cls} />;
    case "percent":
      return <span className="text-xs font-bold">%</span>;
    case "wallet":
    default:
      return <Wallet className={cls} />;
  }
}

function DataHealthScore({ score, weights }: { score: number; weights: { missing: number; dup: number; late: number; category: number } }) {
  const tone =
    score >= 85
      ? "border-[var(--confidence-high)]/25 bg-emerald-500/10 text-emerald-100"
      : score >= 70
        ? "border-[var(--brand-primary)]/25 bg-blue-500/10 text-blue-100"
        : "border-[var(--risk-high)]/25 bg-rose-400/10 text-rose-100";
  return (
    <div className={`rounded-2xl border p-4 ${tone}`}>
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-[0.22em] opacity-90">Data readiness index</div>
        <div className="text-lg font-semibold tabular-nums">{score}</div>
      </div>
      <div className="mt-3 h-2 rounded-full bg-white/10 ring-1 ring-[var(--brand-secondary)]/20">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-accent)]"
          style={{ width: `${Math.max(10, Math.min(100, score))}%` }}
        />
      </div>
      <div className="mt-4 grid gap-2 text-[11px] text-muted-foreground">
        <div className="flex items-center justify-between rounded-xl border border-[var(--brand-secondary)]/25 bg-background/40 px-3 py-2">
          <span>Missing fields</span>
          <span className="font-semibold text-foreground">{weights.missing}%</span>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-[var(--brand-secondary)]/25 bg-background/40 px-3 py-2">
          <span>Duplicate entries</span>
          <span className="font-semibold text-foreground">{weights.dup}%</span>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-[var(--brand-secondary)]/25 bg-background/40 px-3 py-2">
          <span>Late submissions</span>
          <span className="font-semibold text-foreground">{weights.late}%</span>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-[var(--brand-secondary)]/25 bg-background/40 px-3 py-2">
          <span>Inconsistent categorization</span>
          <span className="font-semibold text-foreground">{weights.category}%</span>
        </div>
        <div className="text-[10px] leading-5 opacity-90">
          Weighted components roll up to the readiness index. Lower missing + late weight improves confidence for
          oversight exports.
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { profile } = useProfile();
  const { client } = useClientSession();
  const clientId = client?.clientId ?? null;
  const workspace = useWorkspaceData();
  const [data, setData] = React.useState<SummaryResponse | null>(null);
  const [ml, setMl] = React.useState<MlSummaryResponse | null>(null);
  const [forecastCards, setForecastCards] = React.useState<{
    overspendRiskScore: number;
    payrollGrowthPct: number;
  } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [mlError, setMlError] = React.useState<string | null>(null);
  const [mounted, setMounted] = React.useState(false);
  const [welcomeHeadline, setWelcomeHeadline] = React.useState<string | null>(null);
  const [uploaded, setUploaded] = React.useState<UploadedInsights[]>([]);
  const [viewPreset, setViewPreset] = React.useState<"Auto" | "Finance Lead" | "Auditor" | "Minister / Executive">("Auto");
  const [insightsAlerts, setInsightsAlerts] = React.useState<InsightsAlertSnapshot | null>(null);

  const entity = workspace.ready ? workspace.primaryEntity : profile?.activeEntity || "HQ";
  const orgLabel = entityNavLabel(profile?.orgType);
  const { scope, options, setEntities, setRange } = useAnalyticsScope();
  const range = scope.range;

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    const key = dashboardLastVisitStorageKey(clientId);
    let flushCommitted = false;
    queueMicrotask(() => {
      flushCommitted = true;
    });

    function readLast(): Date | null {
      try {
        const raw = window.localStorage.getItem(key);
        const last = raw ? new Date(raw) : null;
        return last && Number.isFinite(last.getTime()) ? last : null;
      } catch {
        return null;
      }
    }

    function refreshHeadline() {
      try {
        setWelcomeHeadline(buildDashboardWelcomeHeadline(new Date(), readLast()));
      } catch {
        setWelcomeHeadline(buildDashboardWelcomeHeadline(new Date(), null));
      }
    }

    function persistEngagementEnd() {
      try {
        window.localStorage.setItem(key, new Date().toISOString());
      } catch {
        /* ignore */
      }
    }

    refreshHeadline();

    function onVisibility() {
      if (document.visibilityState === "hidden") {
        persistEngagementEnd();
      } else {
        refreshHeadline();
      }
    }

    function onPageHide() {
      persistEngagementEnd();
    }

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      if (flushCommitted) persistEngagementEnd();
    };
  }, [clientId]);

  React.useEffect(() => {
    if (!mounted) return;
    const tick = () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      const all = getUploadedInsights(clientId);
      const entityScope = scope.entities.length
        ? new Set(scope.entities)
        : new Set((profile?.entities?.length ? profile.entities : [entity]).filter(Boolean));
      setUploaded(all.filter((x) => entityScope.has(x.entity)));
    };
    tick();
    const onStorage = (e: StorageEvent) => {
      if (!e.key || !e.key.startsWith("spendda_uploaded_insights")) return;
      tick();
    };
    const onVis = () => {
      if (document.visibilityState === "visible") tick();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(WORKSPACE_DATA_CHANGED, tick);
    document.addEventListener("visibilitychange", onVis);
    const t = window.setInterval(tick, 2800);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(WORKSPACE_DATA_CHANGED, tick);
      document.removeEventListener("visibilitychange", onVis);
      window.clearInterval(t);
    };
  }, [clientId, entity, scope.entities, mounted, profile?.entities]);

  const hasUploads = mounted && uploaded.length > 0;

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setError(null);
        const url = new URL("/api/demo/summary", window.location.origin);
        if (range.from) url.searchParams.set("from", range.from);
        if (range.to) url.searchParams.set("to", range.to);
        if (scope.entities.length) url.searchParams.set("entities", scope.entities.join(","));
        const res = await fetch(url.toString(), { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as SummaryResponse;
        if (!alive) return;
        setData(json);
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Failed to load demo summary");
      }
    })();
    return () => {
      alive = false;
    };
  }, [scope.entities, range.from, range.to]);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (workspace.dataSource === "demo") return;
        const url = new URL("/api/insights/anomalies", window.location.origin);
        if (range.from) url.searchParams.set("from", range.from);
        if (range.to) url.searchParams.set("to", range.to);
        const res = await fetch(url.toString(), { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json().catch(() => ({}))) as any;
        if (!alive) return;
        const dupCount = Number(json?.anomalies?.duplicates?.count || 0);
        const p95 = Number(json?.anomalies?.outliers?.p95 || 0);
        const aboveP95 = Number(json?.anomalies?.outliers?.aboveP95 || 0);
        if (dupCount || p95 || aboveP95) setInsightsAlerts({ duplicateCount: dupCount, p95, aboveP95 });
      } catch {
        /* ignore */
      }
    })();
    return () => {
      alive = false;
    };
  }, [range.from, range.to]);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setMlError(null);
        const res = await fetch("/api/intelligence/ml/summary", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as MlSummaryResponse;
        if (!alive) return;
        setMl(json);
      } catch (e) {
        if (!alive) return;
        setMlError(e instanceof Error ? e.message : "Failed to load ML assist summary");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/demo/forecast", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as { forecast?: { cards?: { overspendRiskScore: number; payrollGrowthPct: number } } };
        if (!alive) return;
        const c = json.forecast?.cards;
        if (c) setForecastCards({ overspendRiskScore: c.overspendRiskScore, payrollGrowthPct: c.payrollGrowthPct });
      } catch {
        /* ignore */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const currency = data?.org.currency || "USD";
  const k = data?.summary.kpis;

  const uploadMetrics = React.useMemo(() => {
    if (workspace.dataSource !== "upload") return null;
    const spendRows = workspace.spendForEntity?.kind === "spend" ? workspace.spendForEntity.rows : undefined;
    const payrollRows = workspace.payrollForEntity?.kind === "payroll" ? workspace.payrollForEntity.rows : undefined;
    return computeUploadDashboardMetrics({
      entity,
      range,
      spendRows: spendRows?.length ? spendRows : undefined,
      payrollRows: payrollRows?.length ? payrollRows : undefined,
    });
  }, [
    workspace.dataSource,
    workspace.spendForEntity,
    workspace.payrollForEntity,
    workspace.revision,
    entity,
    range.from,
    range.to,
  ]);

  const kEffective = uploadMetrics?.kpis ?? k ?? null;

  const healthScore = React.useMemo(() => {
    if (!kEffective) return null;
    const recent = uploadMetrics?.recentFlags ?? data?.summary.recentFlags ?? [];
    const highFlags = recent.filter((f) => f.severity === "High").length;
    const riskBreak = uploadMetrics?.riskBreakdown30d ?? data?.summary.riskBreakdown30d ?? [];
    const riskHigh = riskBreak.find((r) => r.name === "High")?.value ?? 0;
    return portfolioHealthScoreParts({
      forecastRiskScore: kEffective.forecastRiskScore,
      highFlagCount: highFlags,
      riskHighSpendPct: riskHigh,
    });
  }, [data?.summary.recentFlags, data?.summary.riskBreakdown30d, kEffective, uploadMetrics]);

  const pilotRoi = React.useMemo(() => {
    const dup = kEffective ? Math.round(kEffective.savingsOpportunity30d * 0.32) : 120_000;
    const ghost = kEffective ? Math.max(6, Math.round(kEffective.flags30d * 0.14)) : 18;
    const ov = forecastCards
      ? Math.min(28, Math.max(4, Math.round(forecastCards.overspendRiskScore * 0.11)))
      : kEffective
        ? Math.min(28, Math.max(4, Math.round(kEffective.forecastRiskScore * 0.12)))
        : 9;
    const deptLen = uploadMetrics?.departmentSpend30d?.length ?? data?.summary.departmentSpend30d?.length ?? 0;
    const deptAbove = deptLen ? Math.min(12, Math.max(2, Math.round(deptLen * 0.32))) : 4;
    return { dup, ghost, ov, deptAbove };
  }, [kEffective, forecastCards, uploadMetrics?.departmentSpend30d?.length, data?.summary.departmentSpend30d?.length]);

  const kpiTrends = React.useMemo(() => {
    // Lightweight synthetic trends for premium feel (until historical snapshots are stored).
    return {
      spend: 5.2,
      payroll: -2.1,
      flags: 3.4,
      savings: 6.8,
    };
  }, []);

  const effectiveView = React.useMemo(() => {
    if (viewPreset !== "Auto") return viewPreset;
    const r = profile?.role;
    if (r === "Finance Lead") return "Finance Lead";
    if (r === "Auditor") return "Auditor";
    if (r === "Executive") return "Minister / Executive";
    return "Finance Lead";
  }, [profile?.role, viewPreset]);

  const investigationStats = React.useMemo(() => {
    const active = kEffective?.flags30d ?? 0;
    const resolved30d = Math.max(0, Math.round(active * 0.38));
    return { active, resolved30d, avgDays: 6.2 };
  }, [kEffective?.flags30d]);

  const financeNarrative = React.useMemo(() => {
    if (kEffective) {
      const spendDir = kpiTrends.spend >= 0 ? "held slightly over baseline" : "tracked under baseline";
      const payDir = kpiTrends.payroll <= 0 ? "dipped" : "ticked up";
      const queue =
        investigationStats.active > 8
          ? "Review queue is active — triage owners in Investigations."
          : investigationStats.active > 0
            ? `${investigationStats.active} new flags opened — none blocking.`
            : "No open flags in this window — posture is stable.";
      return `Spend ${spendDir}; payroll ${payDir} with period closeout. ${queue}`;
    }
    return "Connect uploads to unlock scoped totals. Demo signals preview the storyline your team exports to the board.";
  }, [investigationStats.active, kEffective, kpiTrends.payroll, kpiTrends.spend]);

  const [trendPreset, setTrendPreset] = React.useState<ChartRangePreset>("30d");
  const chartFillId = React.useId().replace(/:/g, "");

  const exposure = React.useMemo(() => {
    const identified = kEffective?.savingsOpportunity30d ?? 0;
    return {
      identified,
      actioned: Math.round(identified * 0.55),
      recovered: Math.round(identified * 0.22),
    };
  }, [kEffective?.savingsOpportunity30d]);

  const riskModel = React.useMemo((): RiskDimensionScores => {
    const fr = kEffective?.forecastRiskScore ?? 72;
    return {
      operational: Math.min(100, Math.round(38 + fr * 0.22)),
      financial: Math.min(100, Math.round(32 + fr * 0.26)),
      fraud: Math.min(100, Math.round(28 + fr * 0.32)),
      compliance: Math.min(100, Math.round(36 + fr * 0.18)),
    };
  }, [kEffective?.forecastRiskScore]);

  const spendUpload = React.useMemo(
    () => uploaded.find((u) => u.kind === "spend" && u.entity === entity),
    [uploaded, entity],
  );
  const payrollUpload = React.useMemo(
    () => uploaded.find((u) => u.kind === "payroll" && u.entity === entity),
    [uploaded, entity],
  );

  const vendorDependency = React.useMemo(() => {
    if (spendUpload && spendUpload.kind === "spend") {
      const conc = Math.min(
        78,
        24 + Math.round((spendUpload.repeatedCount / Math.max(1, spendUpload.totalTransactions)) * 820),
      );
      const growth = kpiTrends.spend > 4 ? "Rapid spend growth signal" : "Spend velocity stable";
      const singleSource = spendUpload.repeatedCount > 12 ? "Single-source / repeat-invoice cluster" : "No dominant single-source cluster";
      const score = Math.max(8, Math.min(100, 100 - conc + Math.round(spendUpload.unusualCount / 40)));
      return { score, top3Conc: conc, growth, singleSource };
    }
    return { score: 58, top3Conc: 34, growth: "Modeled vendor momentum", singleSource: "Awaiting entity-scoped spend upload" };
  }, [spendUpload, kpiTrends.spend]);

  const payrollStability = React.useMemo(() => {
    if (payrollUpload && payrollUpload.kind === "payroll") {
      const noise =
        payrollUpload.duplicateBankSignals * 4 +
        payrollUpload.inactivePaidSignals * 5 +
        payrollUpload.salarySpikeSignals * 3;
      return Math.max(12, Math.min(96, 94 - Math.min(60, noise)));
    }
    return Math.max(38, 88 - Math.round((kEffective?.forecastRiskScore ?? 70) * 0.35));
  }, [payrollUpload, kEffective?.forecastRiskScore]);

  const dataHealthWeights = React.useMemo(() => {
    const baseMissing = hasUploads ? 6 : profile?.dataMode === "upload" ? 18 : 11;
    const dup = hasUploads ? 9 : 5;
    const late = hasUploads ? 7 : 12;
    const category = hasUploads ? 8 : 14;
    return { missing: baseMissing, dup, late, category };
  }, [hasUploads, profile?.dataMode]);

  const mappedColumnsReadout = React.useMemo(() => {
    if (uploadMetrics) return "Derived from upload (date-scoped)";
    const spend = uploaded.find((u) => u.kind === "spend" && u.entity === entity);
    const payroll = uploaded.find((u) => u.kind === "payroll" && u.entity === entity);
    if (spend && payroll) return "6/6";
    if (spend || payroll) return "6/6";
    if (hasUploads) return "5/6";
    if (profile?.dataMode === "upload") return "4/6";
    return "5/6 (demo)";
  }, [uploadMetrics, uploaded, entity, hasUploads, profile?.dataMode]);

  const chartRiskBreakdown = React.useMemo(
    () => uploadMetrics?.riskBreakdown30d ?? data?.summary.riskBreakdown30d ?? [],
    [uploadMetrics, data?.summary.riskBreakdown30d],
  );
  const chartRecentFlags = React.useMemo(
    () => (uploadMetrics?.recentFlags?.length ? uploadMetrics.recentFlags : data?.summary.recentFlags) ?? [],
    [uploadMetrics, data?.summary.recentFlags],
  );
  const chartDeptSpend = React.useMemo(
    () => uploadMetrics?.departmentSpend30d ?? data?.summary.departmentSpend30d ?? [],
    [uploadMetrics, data?.summary.departmentSpend30d],
  );

  const animatedVendorScore = useAnimatedNumber(vendorDependency.score);
  const animatedPayrollStabilityN = useAnimatedNumber(Math.round(payrollStability));

  const monthAtGlance = React.useMemo(() => {
    const spendChg = `${kpiTrends.spend >= 0 ? "+" : ""}${kpiTrends.spend.toFixed(1)}% vs prior period`;
    const dept =
      uploadMetrics?.departmentSpend30d?.[0]?.department ||
      data?.summary.departmentSpend30d?.[0]?.department ||
      "Operations";
    const conc = `${vendorDependency.top3Conc}% top-3 vendor concentration (modeled)`;
    const payroll = payrollStability >= 72 ? "Payroll stability within tolerance bands." : "Payroll stability under pressure — validate off-cycle payments.";
    const emerging =
      profile?.orgType === "Government"
        ? "Emerging risk: procurement exceptions clustered in two vendor families."
        : "Emerging risk: exception volume trending above 90d baseline.";
    return [spendChg, `Departments exceeding thresholds: ${dept} (+vs plan)`, `Vendor concentration trends: ${conc}`, payroll, emerging];
  }, [
    data?.summary.departmentSpend30d,
    uploadMetrics?.departmentSpend30d,
    kpiTrends.spend,
    payrollStability,
    profile?.orgType,
    vendorDependency.top3Conc,
  ]);

  const trendIntel = React.useMemo(() => {
    const series = uploadMetrics?.monthlySpend?.length
      ? uploadMetrics.monthlySpend
      : data?.summary.monthlySpend;
    if (!series?.length) return [];
    const vals = series.map((p) => p.value);
    return series.map((p, i) => {
      const window = vals.slice(Math.max(0, i - 2), i + 1);
      const ma = window.reduce((a, b) => a + b, 0) / window.length;
      const upper = ma * 1.08;
      const lower = ma * 0.92;
      const peer = ma * 1.03;
      const isAnomaly = Math.abs(p.value - ma) / Math.max(1, ma) > 0.11;
      return {
        month: p.month,
        spend: p.value as number | null,
        upper,
        lower,
        peer,
        anomalyY: isAnomaly ? p.value : null,
        projection: null as number | null,
      };
    });
  }, [data?.summary.monthlySpend, uploadMetrics?.monthlySpend]);

  const trendIntelExtended = React.useMemo(() => {
    if (!trendIntel.length) return [];
    const last = trendIntel[trendIntel.length - 1];
    const lastSpend = Number(last.spend ?? 0);
    const prevSpend = Number(trendIntel[trendIntel.length - 2]?.spend ?? lastSpend);
    const slope = (lastSpend - prevSpend) / Math.max(1, prevSpend) * 0.35;
    const p1 = {
      month: "Next (proj.)",
      spend: null,
      upper: last.upper * (1 + slope),
      lower: last.lower * (1 + slope * 0.6),
      peer: last.peer * (1 + slope * 0.5),
      anomalyY: null as number | null,
      projection: lastSpend * (1 + Math.max(0.004, slope)),
    };
    const p2 = {
      month: "Next+1 (proj.)",
      spend: null,
      upper: p1.upper * (1 + slope * 0.9),
      lower: p1.lower * (1 + slope * 0.55),
      peer: p1.peer * (1 + slope * 0.45),
      anomalyY: null as number | null,
      projection: (p1.projection || lastSpend) * (1 + Math.max(0.003, slope * 0.8)),
    };
    return [...trendIntel, p1, p2];
  }, [trendIntel]);

  const dataHealthScore = React.useMemo(() => {
    if (!profile) return 72;
    if (!hasUploads && profile.dataMode === "upload") return 58;
    if (hasUploads) return 86;
    return profile.dataMode === "demo" ? 82 : 70;
  }, [hasUploads, profile]);

  const kpiTiles = React.useMemo((): KpiTile[] => {
    const investigations: KpiTile = {
      label: "Open flags",
      value: `${investigationStats.active}`,
      hint: `Across ${entity}`,
      trend: kpiTrends.flags,
      trendOverride: `+${Math.max(1, Math.round(kpiTrends.flags))}`,
      icon: "alert" as KpiIconName,
    };
    const exposureTile: KpiTile = {
      label: "Prevented / recoverable exposure",
      value: kEffective ? `${formatMoney(exposure.identified, currency)} identified` : "—",
      hint: `Actioned ${formatMoney(exposure.actioned, currency)} • Recovered ${formatMoney(exposure.recovered, currency)}`,
      trend: kpiTrends.savings,
      icon: "wallet" as KpiIconName,
    };
    const spendTile: KpiTile = {
      label: uploadMetrics ? "Total spend (scoped)" : "Total spend",
      value: kEffective ? kpiFormat(kEffective.totalSpend30d, currency) : "—",
      hint: uploadMetrics ? "From uploaded rows in date range" : "30-day rolling",
      trend: kpiTrends.spend,
      icon: "wallet" as KpiIconName,
    };
    const payrollTile: KpiTile = {
      label: "Payroll",
      value: kEffective ? kpiFormat(kEffective.payrollMonthly, currency) : "—",
      hint: "This period",
      trend: kpiTrends.payroll,
      icon: "users" as KpiIconName,
    };
    const healthTile: KpiTile = {
      label: "Portfolio health",
      value: healthScore == null ? "—" : `${healthScore}/100`,
      hint: "Risk + exceptions composite",
      trend: healthScore != null && healthScore >= 72 ? 1.2 : -2.4,
      icon: "activity" as KpiIconName,
    };
    const dataHealthTile: KpiTile = {
      label: "Data health",
      value: `${dataHealthScore}`,
      hint: "Ingest score",
      trend: 1.2,
      icon: "activity" as KpiIconName,
    };
    const vendorTile: KpiTile = {
      label: "Vendor dependency score",
      value: `${vendorDependency.score}/100`,
      hint: `Top-3 concentration ${vendorDependency.top3Conc}%`,
      trend: kpiTrends.spend,
      icon: "shield" as KpiIconName,
    };
    if (effectiveView === "Auditor") return [investigations, vendorTile, healthTile, exposureTile];
    if (effectiveView === "Minister / Executive")
      return [healthTile, exposureTile, spendTile, investigations, payrollTile];
    return [spendTile, payrollTile, dataHealthTile, investigations];
  }, [
    currency,
    dataHealthScore,
    effectiveView,
    entity,
    healthScore,
    exposure.actioned,
    exposure.identified,
    exposure.recovered,
    investigationStats.active,
    investigationStats.avgDays,
    investigationStats.resolved30d,
    kEffective,
    uploadMetrics,
    kpiTrends.flags,
    kpiTrends.payroll,
    kpiTrends.savings,
    kpiTrends.spend,
    payrollStability,
    vendorDependency.score,
    vendorDependency.top3Conc,
  ]);

  const trendEyebrow = React.useMemo(() => {
    const labels: Record<ChartRangePreset, string> = {
      "7d": "Trend · short window",
      "30d": "Trend · 30 days",
      "90d": "Trend · 90 days",
      YTD: "Trend · year to date",
    };
    return labels[trendPreset];
  }, [trendPreset]);

  const trendChartWindow = React.useMemo(() => {
    const rows = trendIntelExtended;
    if (!rows.length) return [];
    const n = rows.length;
    const take = (k: number) => rows.slice(Math.max(0, n - Math.min(k, n)));
    switch (trendPreset) {
      case "7d":
        return take(5);
      case "30d":
        return take(10);
      case "90d":
        return take(16);
      case "YTD":
      default:
        return rows;
    }
  }, [trendIntelExtended, trendPreset]);

  const trendPeakCaption = React.useMemo(() => {
    const pts = trendChartWindow.filter((p) => p.spend != null && !Number.isNaN(Number(p.spend)));
    if (!pts.length) return null;
    let max = -Infinity;
    let label = "";
    for (const p of pts) {
      const v = Number(p.spend);
      if (v > max) {
        max = v;
        label = String(p.month);
      }
    }
    const sorted = pts.map((p) => Number(p.spend)).sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)] ?? max;
    const deltaPct = median > 0 ? Math.round(((max - median) / median) * 100) : 0;
    return `Peak · ${label} +${deltaPct}% vs. median`;
  }, [trendChartWindow]);

  const kpiSection = React.useMemo(
    () => (
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">
        {kpiTiles.map((x) => {
          const { icon, trendOverride } = x;
          return (
            <div key={x.label} className="group ds-kpi-tile">
              <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[var(--spendda-blue)]/10 blur-2xl transition-opacity group-hover:opacity-100" />
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{x.label}</div>
                {icon ? (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/40 text-[var(--spendda-blue)]">
                    <KpiLucide name={icon} />
                  </div>
                ) : null}
              </div>
              <div className="relative mt-1 font-mono text-[1.65rem] font-semibold tabular-nums tracking-tight text-foreground sm:text-[1.85rem]">
                {(x.label === "Total spend" || x.label === "Total spend (scoped)") && kEffective ? (
                  <AnimatedMoney value={kEffective.totalSpend30d} currency={currency} />
                ) : x.label === "Payroll" && kEffective ? (
                  <AnimatedMoney value={kEffective.payrollMonthly} currency={currency} />
                ) : (
                  x.value
                )}
              </div>
              <div className="mt-auto flex items-center justify-between gap-2 text-xs">
                {trendOverride ? (
                  <KpiDeltaBadge text={trendOverride} up={!trendOverride.trim().startsWith("-")} />
                ) : (
                  <TrendPill deltaPct={x.trend} />
                )}
                <span className="max-w-[10rem] truncate text-right text-muted-foreground">{x.hint}</span>
              </div>
              <div className="relative mt-2 border-t border-border/40 pt-2">
                <MiniSparkline trendPct={x.trend} />
              </div>
            </div>
          );
        })}
      </div>
    ),
    [currency, kEffective, kpiTiles],
  );

  const executiveSummary = React.useMemo(() => {
    const goals = profile?.primaryGoals || [];
    const headline =
      profile?.orgType === "Government"
        ? "Oversight summary for high-accountability spend + payroll."
        : profile?.orgType === "University"
          ? "Operational summary across departments and grants."
          : profile?.orgType === "NGO"
            ? "Program efficiency and donor compliance summary."
            : profile?.orgType === "Hospital"
              ? "Staffing, supplier spend, and budget pressure summary."
              : profile?.orgType === "Bank"
                ? "Branch cost and compliance anomaly summary."
                : "Spend + workforce intelligence summary.";

    const bullets: string[] = [];
    if (kEffective) {
      const spendChg = `${kpiTrends.spend >= 0 ? "+" : ""}${kpiTrends.spend.toFixed(1)}%`;
      const scopeLabel = uploadMetrics ? "uploaded spend in range" : "total spend (30d)";
      bullets.push(
        `${entity}: ${formatMoney(kEffective.totalSpend30d, currency)} ${scopeLabel}, ${investigationStats.active} flagged / investigation signals, spend velocity ${spendChg} vs prior period.`,
      );
    }
    if (goals.includes("Fraud / anomaly detection")) bullets.push("High-severity exceptions prioritized with ownership and evidence.");
    if (goals.includes("Executive reporting")) bullets.push("Board-ready briefing draft available in Reports.");
    if (goals.includes("Budget forecasting")) bullets.push("Forecast pressure tracked weekly with a risk score and variance drivers.");
    if (goals.includes("Procurement savings")) bullets.push("Vendor concentration and repeated-payment signals highlighted for review.");
    if (bullets.length === 0) bullets.push("Recommended next steps are generated from your profile and recent signals.");
    return { headline, bullets: bullets.slice(0, 3) };
  }, [
    currency,
    entity,
    investigationStats.active,
    kEffective,
    uploadMetrics,
    kpiTrends.spend,
    profile?.orgType,
    profile?.primaryGoals,
  ]);

  const execSignals = React.useMemo(() => {
    const topRisk =
      profile?.orgType === "Government"
        ? "Ghost-worker signals elevated in Region B payroll."
        : profile?.orgType === "University"
          ? "Grant-funded spend variance concentrated in Operations."
          : profile?.orgType === "NGO"
            ? "Donor fund utilization anomalies detected in Program 2."
            : profile?.orgType === "Hospital"
              ? "Overtime pressure projected for Nursing in 3 weeks."
              : profile?.orgType === "Bank"
                ? "Branch concentration risk increased in procurement."
                : "Vendor concentration and repeated-payment signals elevated.";

    const exposureNarrative = uploadMetrics
      ? `Upload-derived exposure: ${formatMoney(uploadMetrics.kpis.savingsOpportunity30d, currency)} tied to duplicate / repeated / large-line flags in your file.`
      : hasUploads
        ? "Recoverable exposure concentrated in duplicate/repeated payment clusters from uploads."
        : "Modeled recoverable exposure driven by vendor concentration + repeated-payment clusters.";

    const recommended =
      profile?.primaryGoals?.includes("Executive reporting")
        ? "Export an executive brief and assign owners to high-severity alerts."
        : "Triage high-severity alerts and freeze approvals pending evidence.";

    const confidence = uploadMetrics ? 0.88 : hasUploads ? 0.86 : 0.74;
    return { topRisk, exposureNarrative, recommended, confidence };
  }, [hasUploads, profile?.orgType, profile?.primaryGoals, uploadMetrics, currency]);

  const insightsFeed = React.useMemo(() => {
    type FeedTone = "warning" | "destructive" | "primary" | "accent";
    type FeedItem = { tone: FeedTone; title: string; detail: string };
    if (uploadMetrics) {
      const fm = (n: number) => formatMoney(n, currency);
      const flagged = uploadMetrics.kpis.flags30d;
      const dupish = uploadMetrics.recentFlags.filter((f) => /duplicate|repeated/i.test(f.title)).length;
      const items: FeedItem[] = [
        {
          tone: "warning",
          title: "Flagged transactions",
          detail: `${flagged.toLocaleString()} spend rows in scope carry anomaly flags. Triage by severity in Alerts.`,
        },
        {
          tone: "destructive",
          title: "Duplicate / repeat signals",
          detail: `${dupish.toLocaleString()} uploaded items match duplicate or repeated-payment heuristics.`,
        },
        {
          tone: "primary",
          title: "Spend in range",
          detail: `${fm(uploadMetrics.kpis.totalSpend30d)} summed from spend rows in your selected date range.`,
        },
        {
          tone: "accent",
          title: "Exposure tied to flags",
          detail: `${fm(uploadMetrics.kpis.savingsOpportunity30d)} in flagged line amounts (pilot heuristic, not audited).`,
        },
      ];
      return items;
    }
    if (insightsAlerts) {
      const fm = (n: number) => formatMoney(n, currency);
      const base: FeedItem[] = [
        {
          tone: "warning",
          title: "Large outliers",
          detail: insightsAlerts.p95
            ? `${insightsAlerts.aboveP95.toLocaleString()} transactions are ≥ P95 (${fm(insightsAlerts.p95)}) in the selected range.`
            : "Outlier threshold not available yet (need more spend rows).",
        },
        {
          tone: "destructive",
          title: "Possible duplicates",
          detail: `${insightsAlerts.duplicateCount.toLocaleString()} rows match vendor+invoice+amount duplicate patterns.`,
        },
        {
          tone: "primary",
          title: "Next action",
          detail: "Open Alerts to triage by impact and assign owners (keep evidence links for audit).",
        },
      ];
      return base;
    }
    const base: FeedItem[] = [
      { tone: "warning", title: "Spend spike", detail: "HR spend increased 14% WoW. Review vendor line items." },
      { tone: "destructive", title: "Duplicate payment", detail: "Repeated vendor+amount pattern detected 3+ times in 30 days." },
      { tone: "primary", title: "Forecast pressure", detail: "Overtime costs trending above plan. Consider reforecast scenario." },
      { tone: "accent", title: "Recoverable exposure", detail: "Vendor concentration + repeats indicate recoverable leakage if actioned early." },
      {
        tone: "primary",
        title: "Governance readiness",
        detail:
          "Evidence trails, owner assignment, and export lineage are aligned for this week’s accountability cadence — keep exceptions under SLA.",
      },
    ];
    if (profile?.orgType === "Government") base[0] = { tone: "warning", title: "Budget variance", detail: "Operations variance above plan. Review ministry/region drivers." };
    if (profile?.orgType === "University") base[0] = { tone: "warning", title: "Department variance", detail: "Facilities spend above baseline. Review by school and grant." };
    if (profile?.orgType === "NGO") base[0] = { tone: "warning", title: "Program spend variance", detail: "Program lines trending above donor-approved envelopes. Review allocations." };
    if (profile?.orgType === "Private Company") base[0] = { tone: "warning", title: "Cost center drift", detail: "Indirect spend rising faster than revenue units. Review cost centers and approvals." };
    if (profile?.orgType === "Hospital") base[2] = { tone: "primary", title: "Staffing projection", detail: "Payroll projection suggests overtime rise in Nursing." };
    return base;
  }, [profile?.orgType, uploadMetrics, currency]);

  const actionItems = React.useMemo(() => {
    const goals = profile?.primaryGoals || [];
    const mode = profile?.dataMode || "demo";
    const items: Array<{ title: string; detail: string; href: string; icon: React.ReactNode; tone?: "default" | "secondary" | "outline" }> = [];

    if (mode === "upload" && !hasUploads) {
      items.push({
        title: "Upload your first dataset",
        detail: "CSV/Excel upload with column mapping, data health scoring, and instant insights.",
        href: "/app/upload-data",
        icon: <Upload className="h-4 w-4" />,
        tone: "default",
      });
    }

    if (goals.includes("Fraud / anomaly detection")) {
      items.push({
        title: "Triage high-severity alerts",
        detail: "Assign owners, due dates, and resolve exceptions in the Alert Center.",
        href: "/app/alerts",
        icon: <ShieldAlert className="h-4 w-4" />,
        tone: "secondary",
      });
    }

    if (goals.includes("Executive reporting")) {
      items.push({
        title: "Generate executive brief",
        detail: "Export a board-ready narrative, plus supporting tables and anomaly lists.",
        href: "/app/reports",
        icon: <FileDown className="h-4 w-4" />,
        tone: "outline",
      });
    }

    if (items.length < 3) {
      items.push({
        title: "Open AI Workspace",
        detail: "Generate structured, audit-ready risk and exposure briefs with confidence scoring.",
        href: "/app/ai-workspace",
        icon: <Sparkles className="h-4 w-4" />,
        tone: "secondary",
      });
    }

    return items.slice(0, 4);
  }, [hasUploads, profile?.dataMode, profile?.primaryGoals]);

  return (
    <div className="app-grid-stack app-stagger">
      <div className="ds-finance-hero">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            Finance operations
          </div>
          <h1 className="mt-1.5 font-heading text-xl font-semibold leading-snug tracking-tight text-foreground sm:mt-2 sm:text-2xl sm:leading-tight">
            {welcomeHeadline ?? "Welcome back — here's your latest update."}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:mt-2.5">{financeNarrative}</p>
          <div className="mt-2.5 hidden text-xs leading-relaxed text-muted-foreground sm:block">
            {profile
              ? `${profile.orgType} • ${profile.marketType} • ${entity}`
              : "Institutional oversight workspace — demo signals until uploads are connected."}
          </div>
        </div>
        <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
          <div className="inline-flex min-h-10 w-full min-w-0 items-center gap-2 rounded-full border border-border/60 bg-card/90 px-3 py-1.5 shadow-ds-xs sm:w-auto">
            <Calendar className="h-4 w-4 text-muted-foreground" aria-hidden />
            <DateRangePicker value={range} onChange={setRange} compact />
          </div>
          <Button
            className="h-10 rounded-full bg-[var(--spendda-blue)] px-5 text-sm font-semibold text-white shadow-ds-sm transition-[opacity,box-shadow] hover:opacity-95 hover:shadow-ds-md"
            onClick={() => {
              toast.success("Opening Reports", { description: "Export board packs and executive PDFs." });
              router.push("/app/reports");
            }}
          >
            <FileDown className="mr-2 h-4 w-4" />
            Export briefing
          </Button>
        </div>
      </div>
      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Demo summary failed to load: {error}
        </div>
      ) : null}

      {kpiSection}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="ds-card p-5 lg:col-span-2">
          <DsSectionHeader
            eyebrow={trendEyebrow}
            title="Consolidated spend"
            sub={`${entity} — all categories, weekdays weighted.`}
            action={
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Badge variant="outline" className="shrink-0">
                  {currency}
                </Badge>
                <DsChartRangePills value={trendPreset} onChange={setTrendPreset} />
              </div>
            }
          />
          <p className="mt-1 text-xs text-muted-foreground sm:hidden">
            Variance band, peer overlay, anomalies, and forward projection — hover the chart for detail.
          </p>
          <div className="mt-4 ds-chart-well h-[min(320px,52vh)] min-h-[220px] sm:min-h-[260px]">
            {trendIntelExtended.length === 0 ? (
              <div className="grid h-full min-h-[200px] place-items-center">
                <div className="w-full max-w-md px-2">
                  <Skeleton className="h-6 w-56" />
                  <Skeleton className="mt-4 h-52 w-full" />
                </div>
              </div>
            ) : (
              <SpenddaResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trendChartWindow} margin={{ left: 4, right: 4, top: 4, bottom: 4 }}>
                  <defs>
                    <linearGradient id={`spendFill-${chartFillId}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.28} />
                      <stop offset="55%" stopColor="hsl(var(--primary))" stopOpacity={0.08} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.01} />
                    </linearGradient>
                    <filter id={`softGlow-${chartFillId}`} x="-30%" y="-30%" width="160%" height="160%">
                      <feGaussianBlur stdDeviation="6" result="blur" />
                      <feColorMatrix
                        in="blur"
                        type="matrix"
                        values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.35 0"
                      />
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${Math.round(Number(v) / 1_000_000)}M`}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 12,
                    }}
                    formatter={(value, name) => {
                      if (value == null || Number.isNaN(Number(value))) return null;
                      const label =
                        name === "upper"
                          ? "Variance ceiling"
                          : name === "lower"
                            ? "Variance floor"
                            : name === "peer"
                              ? "Peer overlay"
                              : name === "projection"
                                ? "Forward projection"
                                : name === "anomalyY"
                                  ? "Anomaly point"
                                  : "Observed spend";
                      return [formatMoney(Number(value), currency), label];
                    }}
                    labelFormatter={(lbl) => `Period: ${lbl}`}
                    cursor={{ stroke: "hsl(var(--primary))", strokeOpacity: 0.22, strokeWidth: 1 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="spend"
                    stroke="hsl(var(--primary))"
                    fill={`url(#spendFill-${chartFillId})`}
                    strokeWidth={2.5}
                    dot={false}
                    connectNulls
                    isAnimationActive={false}
                    activeDot={{ r: 4.5, strokeWidth: 2, stroke: "hsl(var(--background))", fill: "hsl(var(--primary))" }}
                    filter={`url(#softGlow-${chartFillId})`}
                  />
                  <Line
                    type="monotone"
                    dataKey="upper"
                    stroke="hsl(var(--warning))"
                    strokeWidth={1.25}
                    strokeDasharray="4 4"
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="lower"
                    stroke="hsl(var(--accent))"
                    strokeWidth={1.25}
                    strokeDasharray="4 4"
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="peer"
                    stroke="hsl(var(--muted-foreground))"
                    strokeOpacity={0.55}
                    strokeWidth={1.25}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="projection"
                    stroke="hsl(var(--accent))"
                    strokeWidth={2}
                    strokeDasharray="6 5"
                    dot={false}
                    connectNulls
                    isAnimationActive={false}
                  />
                  <Scatter dataKey="anomalyY" fill="hsl(var(--destructive))" isAnimationActive={false} />
                </ComposedChart>
              </SpenddaResponsiveContainer>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--spendda-blue)]" /> Actual
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--spendda-green)]" /> Forecast
            </span>
            {trendPeakCaption ? (
              <span className="font-medium text-foreground sm:ml-auto">{trendPeakCaption}</span>
            ) : null}
          </div>
        </div>

        <div className="ds-card flex flex-col p-5">
          <DsSectionHeader
            eyebrow="Risk mix"
            title="Flag severity"
            action={
              <Badge variant="outline" className="border-[var(--brand-primary)]/25">
                Model {kEffective ? `${kEffective.forecastRiskScore}/100` : "—"}
              </Badge>
            }
          />
          <div className="mt-4 min-h-0 flex-1">
            {chartRiskBreakdown.length === 0 ? (
              <div className="grid min-h-[240px] place-items-center">
                <Skeleton className="h-48 w-full max-w-[200px] rounded-full" />
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
                  <div className="mx-auto grid h-[200px] w-[200px] shrink-0 min-w-0 sm:mx-0 sm:h-[160px] sm:w-[160px]">
                    <SpenddaResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip
                          contentStyle={{
                            background: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: 12,
                          }}
                        />
                        <Pie
                          data={chartRiskBreakdown}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={44}
                          outerRadius={78}
                          stroke="hsl(var(--border))"
                        >
                          {chartRiskBreakdown.map((entry) => {
                            const color =
                              entry.name === "High"
                                ? "#ef4444"
                                : entry.name === "Medium"
                                  ? "#f59e0b"
                                  : "#10b981";
                            return <Cell key={entry.name} fill={color} opacity={0.92} />;
                          })}
                        </Pie>
                      </PieChart>
                    </SpenddaResponsiveContainer>
                  </div>
                  <div className="grid min-w-0 flex-1 gap-2.5">
                    {chartRiskBreakdown.map((r) => {
                      const dot =
                        r.name === "High" ? "#ef4444" : r.name === "Medium" ? "#f59e0b" : "#10b981";
                      return (
                        <div
                          key={r.name}
                          className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2"
                        >
                          <span className="inline-flex min-w-0 items-center gap-2 text-sm">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: dot }} />
                            <span className="truncate">{r.name}</span>
                          </span>
                          <span className="font-mono text-sm font-semibold tabular-nums text-foreground">{r.value}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="mt-5 border-t border-border/60 pt-4">
                  <RiskDimensionsPanel scores={riskModel} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="ds-card p-5 lg:col-span-1">
          <DsSectionHeader eyebrow="Departments" title="Spend by department" />
          <div className="mt-4 min-h-[200px] w-full min-w-0">
            {chartDeptSpend.length === 0 ? (
              <div className="grid gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <SpenddaResponsiveContainer width="100%" height={220}>
                <BarChart layout="vertical" data={chartDeptSpend.slice(0, 8)} margin={{ left: 4, right: 12, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.12} />
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="department"
                    width={92}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(v) => formatMoney(Number(v), currency)}
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 12,
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} fill="hsl(var(--primary))" isAnimationActive={false} />
                </BarChart>
              </SpenddaResponsiveContainer>
            )}
          </div>
        </div>

        <div className="ds-card p-5 lg:col-span-2">
          <DsSectionHeader
            eyebrow="Flagged activity"
            title="Recent investigations"
            sub="Severity-ranked, newest first."
            action={
              <Link
                href="/app/alerts"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-full border-border/70")}
              >
                View all <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            }
          />
          <div className="mt-4">
            {chartRecentFlags.length === 0 ? (
              <div className="grid gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))}
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border bg-background">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Flag</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Severity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {chartRecentFlags.slice(0, 6).map((f) => (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium">{f.id}</TableCell>
                        <TableCell>{f.title}</TableCell>
                        <TableCell className="text-muted-foreground">{f.entity}</TableCell>
                        <TableCell className="text-right">
                          {typeof f.amount === "number" ? formatMoney(f.amount, currency) : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <SeverityBadge severity={f.severity} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <Separator className="my-4" />
            <div className="text-xs text-muted-foreground">
              Tip: assign an owner, due date, and status in Investigations to preserve an audit-grade case trail.
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{orgLabel} benchmarks</CardTitle>
            <Link href="/app/benchmarks" className="text-xs font-semibold text-primary hover:underline">
              View benchmarks <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="grid gap-3">
            {chartDeptSpend.length === 0 ? (
              <div className="grid gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {chartDeptSpend.slice(0, 5).map((d, idx) => (
                  <div key={d.department} className="rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 text-sm font-semibold">
                        {idx + 1}. {d.department}
                      </div>
                      <Badge variant="outline" className="shrink-0">
                        {formatMoney(d.value, currency)}
                      </Badge>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Benchmark against peers in {orgLabel.toLowerCase()}.
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <WorkspaceTrustBanner />
      <SpenddaVsExcelStrip variant="app" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-1 flex-wrap items-end gap-2">
          <div className="grid w-full gap-1 sm:w-[260px]">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">View preset</div>
            <Select
              value={viewPreset}
              onValueChange={(v) =>
                v && setViewPreset(v as "Auto" | "Finance Lead" | "Auditor" | "Minister / Executive")
              }
            >
              <SelectTrigger className="h-9 border-[var(--brand-primary)]/25 bg-background/80">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Auto">Auto (from role)</SelectItem>
                <SelectItem value="Finance Lead">Finance Lead view</SelectItem>
                <SelectItem value="Auditor">Auditor view</SelectItem>
                <SelectItem value="Minister / Executive">Minister / Executive view</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid w-full min-w-0 gap-1 sm:w-[320px]">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Entity scope</div>
            <EntityMultiSelect
              options={options}
              value={scope.entities}
              onChange={setEntities}
              placeholder="Select entities"
            />
          </div>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="outline" onClick={() => router.push("/app/upload-data")} className="border-[var(--brand-primary)]/25">
              <Upload className="mr-2 h-4 w-4" />
              Upload data
            </Button>
            <Button onClick={() => router.push("/app/ai-workspace")} className="shadow-[0_10px_30px_rgba(37,99,235,0.18)]">
              <Sparkles className="mr-2 h-4 w-4" />
              Open AI Workspace
            </Button>
          </div>
          <div className="text-right text-[11px] text-muted-foreground">Active preset: {effectiveView}</div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="border-border/60 shadow-md lg:col-span-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Operating model signals</CardTitle>
            <div className="text-xs text-muted-foreground">
              {profile?.orgType ? `${profile.orgType} playbook` : "Industry playbook"} — tuned to your onboarding
              profile.
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {orgSignalsForType(profile?.orgType).map((s) => (
              <div
                key={s.title}
                className={[
                  "rounded-2xl border p-4 text-sm",
                  s.tone === "rose"
                    ? "border-rose-500/20 bg-rose-500/5"
                    : s.tone === "amber"
                      ? "border-amber-500/20 bg-amber-500/5"
                      : s.tone === "emerald"
                        ? "border-emerald-500/20 bg-emerald-500/5"
                        : "border-[var(--spendda-blue)]/20 bg-[var(--spendda-blue)]/5",
                ].join(" ")}
              >
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{s.title}</div>
                <p className="mt-2 text-sm leading-relaxed text-foreground">{s.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-md lg:col-span-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pilot ROI indicators</CardTitle>
            <div className="text-xs text-muted-foreground">
              {uploadMetrics
                ? "Heuristics anchored to upload KPIs (flags + exposure); still directional for pilots."
                : "Modeled from demo signals + uploads — investor-safe framing."}
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border/60 bg-muted/15 p-4">
              <div className="text-xs font-semibold text-muted-foreground">Duplicate / leakage exposure</div>
              <div className="mt-2 text-xl font-semibold tabular-nums text-foreground">{kpiFormat(pilotRoi.dup, currency)}</div>
              <div className="mt-1 text-xs text-muted-foreground">Estimated recoverable if triaged this quarter.</div>
            </div>
            <div className="rounded-2xl border border-border/60 bg-muted/15 p-4">
              <div className="text-xs font-semibold text-muted-foreground">Ghost / anomaly workers (signals)</div>
              <div className="mt-2 text-xl font-semibold tabular-nums text-foreground">{pilotRoi.ghost}</div>
              <div className="mt-1 text-xs text-muted-foreground">Payroll + identity anomalies flagged for review.</div>
            </div>
            <div className="rounded-2xl border border-border/60 bg-muted/15 p-4">
              <div className="text-xs font-semibold text-muted-foreground">Overspend risk (forecast)</div>
              <div className="mt-2 text-xl font-semibold tabular-nums text-foreground">{pilotRoi.ov}%</div>
              <div className="mt-1 text-xs text-muted-foreground">Scenario-weighted pressure vs. plan.</div>
            </div>
            <div className="rounded-2xl border border-border/60 bg-muted/15 p-4">
              <div className="text-xs font-semibold text-muted-foreground">{orgLabel} above benchmark</div>
              <div className="mt-2 text-xl font-semibold tabular-nums text-foreground">{pilotRoi.deptAbove}</div>
              <div className="mt-1 text-xs text-muted-foreground">Outliers vs. peer concentration in the last window.</div>
            </div>
          </CardContent>
        </Card>

        <MarketRegulatoryWidget />

        <Card className="border-border/60 shadow-md lg:col-span-12">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">ML assistive intelligence (Phase 1)</CardTitle>
              <div className="text-xs text-muted-foreground">
                Lightweight statistical baselines with confidence + drivers. Rules engine remains authoritative.
              </div>
            </div>
            {ml?.summary?.confidencePct ? (
              <Badge variant="outline" className="w-fit">
                {ml.summary.confidencePct}% ML confidence
              </Badge>
            ) : (
              <Badge variant="outline" className="w-fit">
                ML overlay
              </Badge>
            )}
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border bg-background p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Rules vs ML</div>
              {mlError ? (
                <div className="mt-2 text-sm text-muted-foreground">ML unavailable: {mlError}</div>
              ) : ml ? (
                <div className="mt-3 grid gap-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Rule flags (30d)</span>
                    <span className="font-semibold text-foreground tabular-nums">{ml.summary.comparison.ruleFlags30d.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">ML anomalies (30d)</span>
                    <span className="font-semibold text-foreground tabular-nums">{ml.summary.comparison.mlAnomalies30d.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Agreement (estimate)</span>
                    <span className="font-semibold text-foreground tabular-nums">{ml.summary.comparison.overlapEstimate}%</span>
                  </div>
                  <div className="pt-2 text-xs text-muted-foreground">
                    Use deltas to tune thresholds and prioritize investigations; ML never auto-closes cases.
                  </div>
                </div>
              ) : (
                <div className="mt-3 grid gap-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              )}
            </div>

            <div className="rounded-2xl border bg-background p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Top ML findings</div>
              {ml ? (
                <div className="mt-3 grid gap-2">
                  {ml.summary.anomalies.top.slice(0, 4).map((a) => (
                    <div key={a.title} className="rounded-xl border border-border/60 bg-muted/10 px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate text-sm font-semibold text-foreground">{a.title}</div>
                        <Badge variant="outline" className="shrink-0 text-xs">
                          {a.confidencePct}%
                        </Badge>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">{a.explain?.[0] ?? ""}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-3 grid gap-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              )}
            </div>

            <div className="rounded-2xl border bg-background p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Forecast (ML band)</div>
              {ml ? (
                <div className="mt-3 grid gap-2 text-sm">
                  {ml.summary.forecast.points.slice(0, 3).map((p) => (
                    <div key={p.month} className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/10 px-3 py-2">
                      <span className="text-muted-foreground">{p.month}</span>
                      <span className="font-semibold text-foreground tabular-nums">
                        {formatMoney(p.projected, currency)} <span className="text-xs text-muted-foreground">({p.confidencePct}%)</span>
                      </span>
                    </div>
                  ))}
                  <Button size="sm" variant="outline" className="mt-1 w-fit" onClick={() => router.push("/app/forecasting")}>
                    Review scenarios <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="mt-3 grid gap-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>



      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="shadow-sm lg:col-span-8">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">Executive summary</CardTitle>
            <Badge variant="outline">
              {orgLabel} • {workspace.dataSource === "upload" ? "upload KPIs" : hasUploads ? "insights + demo" : "demo signals"}
            </Badge>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="surface surface-hover animate-fade-in-up rounded-[1.25rem] border border-[var(--spendda-blue)]/15 bg-gradient-to-br from-[var(--spendda-navy)]/[0.04] via-card/95 to-[var(--spendda-blue)]/[0.07] p-5 md:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    Intelligence briefing
                  </div>
                  <h3 className="font-heading mt-2 text-lg font-semibold tracking-tight text-foreground">Executive oversight</h3>
                </div>
                <Badge variant="outline" className="border-[var(--spendda-blue)]/25 bg-background/60">
                  {Math.round(execSignals.confidence * 100)}% model confidence
                </Badge>
              </div>
              <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_minmax(200px,260px)]">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-border/50 bg-background/50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Top issue</div>
                    <p className="mt-2 text-sm font-semibold leading-relaxed text-foreground">{execSignals.topRisk}</p>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-background/50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Savings found</div>
                    <p className="mt-2 text-sm font-semibold tabular-nums text-[hsl(var(--success))]">
                      {kEffective ? `${formatMoney(exposure.identified, currency)}` : "—"}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {kEffective
                        ? `${formatMoney(exposure.recovered, currency)} recovered (modeled) · ${formatMoney(exposure.actioned, currency)} actioned`
                        : "Connect uploads to sharpen savings signals."}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-background/50 p-4 sm:col-span-2">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Recommendation</div>
                    <p className="mt-2 text-sm font-medium leading-relaxed text-foreground">{execSignals.recommended}</p>
                  </div>
                </div>
                <div className="flex flex-col justify-between gap-4 rounded-xl border border-border/60 bg-gradient-to-b from-muted/30 to-background/80 p-4 shadow-inner">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Confidence</div>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="font-heading text-3xl font-bold tabular-nums tracking-tight">
                        {Math.round(execSignals.confidence * 100)}
                      </span>
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-muted/50">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-[var(--spendda-blue)] to-[var(--spendda-green)]"
                      style={{ width: `${Math.round(execSignals.confidence * 100)}%` }}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Button
                      variant="outline"
                      className="justify-between border-[var(--spendda-blue)]/20 shadow-sm"
                      onClick={() => {
                        toast.success("Opening Reports", { description: "Export board packs and executive PDFs." });
                        router.push("/app/reports");
                      }}
                    >
                      Export brief
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      className="justify-between shadow-sm"
                      onClick={() => {
                        toast.message("Investigations", { description: "Triage cases, owners, and due dates." });
                        router.push("/app/alerts");
                      }}
                    >
                      Investigations
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--brand-secondary)]/25 bg-background p-4 shadow-sm">
              <div className="text-sm font-semibold">{executiveSummary.headline}</div>
              <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
                {executiveSummary.bullets.map((b) => (
                  <li key={b} className="leading-7">
                    {b}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-[var(--brand-primary)]/20 bg-gradient-to-br from-[var(--brand-primary)]/8 via-background to-[var(--brand-accent)]/8 p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                This month at a glance
              </div>
              <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
                {monthAtGlance.map((b) => (
                  <li key={b} className="leading-7">
                    {b}
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-[var(--brand-secondary)]/25 bg-background p-4 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Vendor dependency</div>
                <div className="mt-2 text-2xl font-semibold tracking-tight text-brand-primary tabular-nums">
                  {animatedVendorScore ?? vendorDependency.score}/100
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Top-3 concentration {vendorDependency.top3Conc}% • {vendorDependency.growth} • {vendorDependency.singleSource}
                </div>
              </div>
              <div className="rounded-2xl border border-[var(--brand-secondary)]/25 bg-background p-4 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Payroll stability index</div>
                <div className="mt-2 text-2xl font-semibold tracking-tight text-brand-primary tabular-nums">
                  {animatedPayrollStabilityN ?? Math.round(payrollStability)}/100
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Grounded in variance vs baseline, headcount anomalies, departmental clustering, and off-cycle payment signals.
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 p-4 shadow-inner">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Exposure narrative</div>
              <p className="mt-2 text-sm font-medium leading-relaxed text-foreground">{execSignals.exposureNarrative}</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:col-span-4">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Auto insights</CardTitle>
              <Badge variant="outline">Live feed</Badge>
            </CardHeader>
            <CardContent className="grid gap-3">
              {insightsFeed.map((i) => {
                const tone =
                  i.tone === "destructive"
                    ? "border-rose-400/20 bg-rose-400/10"
                    : i.tone === "warning"
                      ? "border-amber-400/20 bg-amber-400/10"
                      : i.tone === "accent"
                        ? "border-emerald-400/20 bg-emerald-400/10"
                        : "border-blue-400/20 bg-blue-500/10";
                return (
                  <div
                    key={i.title}
                    className={`surface-hover rounded-2xl border p-4 transition-transform ${tone}`}
                  >
                    <div className="text-sm font-semibold text-foreground">{i.title}</div>
                    <div className="mt-2 text-xs leading-6 text-muted-foreground">{i.detail}</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          toast.message("Investigations", { description: "Review severity and evidence for this signal." });
                          router.push("/app/alerts");
                        }}
                      >
                        Open queue <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          toast.success("Assign owner", { description: "Pick a case and set Owner + due date in the table." });
                          router.push("/app/alerts?focus=owner");
                        }}
                      >
                        <UserRound className="mr-1 h-3.5 w-3.5" />
                        Assign owner
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          toast.message("Forecasting", { description: "Adjust scenarios and re-run projections." });
                          router.push("/app/forecasting");
                        }}
                      >
                        Reforecast <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Data readiness</CardTitle>
              <Link href="/app/upload-data" className="text-xs font-semibold text-primary hover:underline">
                Manage <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
              </Link>
            </CardHeader>
            <CardContent className="grid gap-3">
              <DataHealthScore score={dataHealthScore} weights={dataHealthWeights} />
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border bg-background p-4 shadow-sm">
                  <div className="text-xs text-muted-foreground">Completeness</div>
                  <div className="mt-2 text-xl font-semibold tracking-tight">
                    {hasUploads ? "92%" : profile?.dataMode === "upload" ? "61%" : "84%"}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">Required fields present</div>
                </div>
                <div className="rounded-2xl border bg-background p-4 shadow-sm">
                  <div className="text-xs text-muted-foreground">Duplicate rows</div>
                  <div className="mt-2 text-xl font-semibold tracking-tight">
                    {hasUploads ? "Moderate" : "Low"}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">Across latest uploads</div>
                </div>
                <div className="rounded-2xl border bg-background p-4 shadow-sm">
                  <div className="text-xs text-muted-foreground">Mapped columns</div>
                  <div className="mt-2 text-xl font-semibold tracking-tight">{mappedColumnsReadout}</div>
                  <div className="mt-1 text-xs text-muted-foreground">Required dimensions mapped to Spendda schema</div>
                </div>
              </div>
              <div className="rounded-2xl border bg-background p-4 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Latest uploads
                </div>
                <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                  {!hasUploads ? (
                    <ProductEmptyState
                      icon={Upload}
                      title={`No files yet for ${entity}`}
                      description="Upload spend or payroll to unlock file-grounded KPIs, risk signals, and export lineage for this workspace."
                      action={
                        <Link
                          href="/app/upload-data"
                          className={cn(buttonVariants({ size: "sm" }), "rounded-xl")}
                        >
                          Open uploads
                        </Link>
                      }
                    />
                  ) : (
                    uploaded.slice(0, 3).map((u) => (
                      <div key={`${u.kind}-${u.filename}`} className="flex items-center justify-between">
                        <span className="font-medium text-foreground">{u.kind.toUpperCase()}</span>
                        <span className="truncate">{u.filename}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Action center</CardTitle>
              <Badge variant="outline">prioritized</Badge>
            </CardHeader>
            <CardContent className="grid gap-3">
              {actionItems.map((a) => (
                <button
                  key={a.title}
                  type="button"
                  onClick={() => {
                    toast.success(a.title, { description: "Opening the linked workspace…" });
                    router.push(a.href);
                  }}
                  className="flex items-start justify-between gap-3 rounded-2xl border bg-background p-4 text-left shadow-sm transition-[background-color,border-color,box-shadow,transform] duration-200 ease-out motion-safe:hover:-translate-y-px motion-safe:hover:border-primary/15 motion-safe:hover:bg-muted/35 motion-safe:hover:shadow-ds-sm"
                >
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <span className="grid h-7 w-7 place-items-center rounded-xl border bg-muted/20">
                        {a.icon}
                      </span>
                      {a.title}
                    </div>
                    <div className="mt-2 text-xs leading-6 text-muted-foreground">{a.detail}</div>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  );
}

