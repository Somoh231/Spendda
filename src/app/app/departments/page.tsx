"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight, Flame, Sparkles } from "lucide-react";

import { SpenddaResponsiveContainer } from "@/components/app/spendda-responsive-container";
import { formatMoney } from "@/lib/mock/demo";
import { useProfile } from "@/lib/profile/client";
import { entityNavLabel } from "@/lib/profile/org-adaptation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AnalyticsScopeControls, useAnalyticsScope } from "@/components/app/analytics-scope";

type Summary = {
  deptSpend30d: Array<{ department: string; spend: number }>;
};

type SummaryApi = {
  summary?: {
    departmentSpend30d?: Array<{ department: string; value: number }>;
  };
};

export default function DepartmentsPage() {
  const router = useRouter();
  const { profile } = useProfile();
  const navLabel = entityNavLabel(profile?.orgType);
  const [summary, setSummary] = React.useState<Summary | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const { scope } = useAnalyticsScope();

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadError(null);
        const url = new URL("/api/demo/summary", window.location.origin);
        if (scope.range.from) url.searchParams.set("from", scope.range.from);
        if (scope.range.to) url.searchParams.set("to", scope.range.to);
        if (scope.entities.length) url.searchParams.set("entities", scope.entities.join(","));
        const res = await fetch(url.toString(), { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as SummaryApi;
        const raw = json.summary?.departmentSpend30d ?? [];
        if (!alive) return;
        setSummary({
          deptSpend30d: raw.map((d) => ({
            department: d.department,
            spend: d.value,
          })),
        });
      } catch (e) {
        if (!alive) return;
        setLoadError(e instanceof Error ? e.message : "Failed to load departments");
        setSummary({ deptSpend30d: [] });
      }
    })();
    return () => {
      alive = false;
    };
  }, [scope.entities, scope.range.from, scope.range.to]);

  const ranked = React.useMemo(() => {
    const list = summary?.deptSpend30d || [];
    const max = Math.max(...list.map((x) => x.spend), 1);
    return list
      .slice()
      .sort((a, b) => b.spend - a.spend)
      .map((x, idx) => {
        const intensity = x.spend / max;
        const risk = intensity > 0.82 ? "High" : intensity > 0.6 ? "Medium" : "Low";
        return { ...x, rank: idx + 1, intensity, risk };
      });
  }, [summary?.deptSpend30d]);

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="app-page-title">{navLabel}</div>
          <div className="app-page-desc">
            Rankings, variance signals, and overspend heatmap for {navLabel.toLowerCase()} within the selected scope.
          </div>
          {loadError ? (
            <div className="mt-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              Could not load department data: {loadError}
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-xl shadow-sm" onClick={() => router.push("/app/benchmarks")}>
            Compare entities <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button variant="secondary" className="rounded-xl shadow-sm" onClick={() => router.push("/app/ai-workspace")}>
            AI Workspace <Sparkles className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Analytics scope</CardTitle>
        </CardHeader>
        <CardContent>
          <AnalyticsScopeControls />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-sm lg:col-span-2">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">{navLabel} spend</CardTitle>
            <Badge variant="outline">
              Top 10 • ranked
            </Badge>
          </CardHeader>
          <CardContent className="h-[360px] min-w-0">
            {!summary ? (
              <Skeleton className="h-full w-full" />
            ) : ranked.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 bg-muted/10 p-8 text-center text-sm text-muted-foreground">
                <p>No department spend rows in the demo snapshot.</p>
                <p className="text-xs">Try again shortly or open the Dashboard to confirm the demo dataset loaded.</p>
              </div>
            ) : (
              <SpenddaResponsiveContainer width="100%" height="100%">
                <BarChart data={ranked.slice(0, 10)} margin={{ left: 8, right: 8 }}>
                  <defs>
                    <linearGradient id="deptSpendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.92} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                    </linearGradient>
                    <filter id="barGlow" x="-30%" y="-30%" width="160%" height="160%">
                      <feGaussianBlur stdDeviation="5" result="blur" />
                      <feColorMatrix
                        in="blur"
                        type="matrix"
                        values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.25 0"
                      />
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
                  <XAxis
                    dataKey="department"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${Math.round(Number(v) / 1_000_000)}M`}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value) => formatMoney(Number(value))}
                    contentStyle={{
                      background: "hsl(var(--card) / 0.98)",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 12,
                      boxShadow: "0 18px 50px rgba(2, 6, 23, 0.35)",
                    }}
                    labelStyle={{ fontWeight: 600, fontSize: 12 }}
                    cursor={{ fill: "hsl(var(--primary))", fillOpacity: 0.08 }}
                  />
                  <Bar
                    dataKey="spend"
                    fill="url(#deptSpendFill)"
                    radius={[12, 12, 0, 0]}
                    barSize={28}
                    filter="url(#barGlow)"
                  />
                </BarChart>
              </SpenddaResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Overspend heatmap</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {!summary ? (
              <Skeleton className="h-36 w-full" />
            ) : ranked.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 px-3 py-6 text-center text-xs text-muted-foreground">
                Heatmap appears once department spend data is available.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {ranked.slice(0, 8).map((d) => {
                  const bg =
                    d.risk === "High"
                      ? "bg-rose-400/15 border-rose-400/20"
                      : d.risk === "Medium"
                        ? "bg-amber-400/15 border-amber-400/20"
                        : "bg-emerald-400/10 border-emerald-400/20";
                  return (
                    <div key={d.department} className={`rounded-2xl border p-3 ${bg}`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate text-sm font-semibold">{d.department}</div>
                        {d.risk === "High" ? (
                          <Flame className="h-4 w-4 text-rose-200" />
                        ) : null}
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        {formatMoney(d.spend)} • {d.risk} signal
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              Heatmap intensity is derived from spend concentration in the last 30 days.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Rankings & actions</CardTitle>
          <Badge variant="outline">One‑click triage</Badge>
        </CardHeader>
        <CardContent>
          {!summary ? (
            <Skeleton className="h-40 w-full" />
          ) : ranked.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 px-4 py-10 text-center text-sm text-muted-foreground">
              No rankings to show yet.
            </div>
          ) : (
            <div className="data-table-scroll">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-right">Spend</TableHead>
                    <TableHead className="text-right">Signal</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ranked.slice(0, 12).map((d) => (
                    <TableRow key={d.department}>
                      <TableCell className="text-muted-foreground">{d.rank}</TableCell>
                      <TableCell className="font-medium">{d.department}</TableCell>
                      <TableCell className="text-right font-medium">{formatMoney(d.spend)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={d.risk === "High" ? "destructive" : d.risk === "Medium" ? "warning" : "outline"}>
                          {d.risk}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" className="rounded-lg" onClick={() => router.push("/app/alerts")}>
                          Open alerts <ArrowRight className="ml-1 h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

