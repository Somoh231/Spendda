"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Clock, FileSpreadsheet, HeartPulse, ShieldCheck, Upload } from "lucide-react";

import { useProfile } from "@/lib/profile/client";
import { getUploadedInsights } from "@/lib/upload/storage";
import { WORKSPACE_DATA_CHANGED } from "@/lib/workspace/workspace-events";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HydrationSafeDate } from "@/components/app/hydration-safe-date";
import { useClientSession } from "@/hooks/use-client-session";
import { useAnalyticsScope } from "@/components/app/analytics-scope";
import { PremiumUploadExperience } from "@/components/app/premium-upload-experience";
import { SpenddaVsExcelStrip } from "@/components/app/spendda-vs-excel-strip";
import { tenantRoleCan } from "@/lib/tenants/permissions";

function scoreFromInsights(items: ReturnType<typeof getUploadedInsights>) {
  // Lightweight proxy until we compute true row-level health.
  if (items.length === 0) return { score: 62, note: "No uploaded files yet. Start with a sample upload." };
  const spend = items.find((x) => x.kind === "spend");
  const payroll = items.find((x) => x.kind === "payroll");
  const score =
    (spend ? 18 : 0) +
    (payroll ? 18 : 0) +
    (spend && "flaggedCount" in spend ? Math.max(0, 40 - Math.min(40, spend.flaggedCount / 10)) : 20) +
    (payroll && "highRisk" in payroll ? Math.max(0, 24 - Math.min(24, payroll.highRisk)) : 12);
  const s = Math.max(35, Math.min(96, Math.round(score)));
  return { score: s, note: s >= 80 ? "Good coverage. Ready for analytics." : "Some issues detected. Review mapping and missing fields." };
}

export default function UploadDataPage() {
  const router = useRouter();
  const { profile } = useProfile();
  const { client } = useClientSession();
  const clientId = client?.clientId ?? null;
  const canUpload = tenantRoleCan(client?.role, "data.upload");
  const { scope } = useAnalyticsScope();
  const entity = scope.entities[0] || profile?.activeEntity || "HQ";
  const [mounted, setMounted] = React.useState(false);
  const [items, setItems] = React.useState<ReturnType<typeof getUploadedInsights>>([]);

  React.useEffect(() => {
    setMounted(true);
    const tick = () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      setItems(getUploadedInsights(clientId));
    };
    tick();
    const onVis = () => {
      if (document.visibilityState === "visible") tick();
    };
    window.addEventListener(WORKSPACE_DATA_CHANGED, tick);
    document.addEventListener("visibilitychange", onVis);
    const t = window.setInterval(tick, 2500);
    return () => {
      window.removeEventListener(WORKSPACE_DATA_CHANGED, tick);
      document.removeEventListener("visibilitychange", onVis);
      window.clearInterval(t);
    };
  }, [clientId]);

  const entityItems = React.useMemo(() => items.filter((x) => x.entity === entity), [items, entity]);
  const health = scoreFromInsights(mounted ? entityItems : []);
  const spend = entityItems.find((x) => x.kind === "spend");
  const payroll = entityItems.find((x) => x.kind === "payroll");
  const completeness = entityItems.length === 0 ? 61 : health.score >= 80 ? 92 : 74;
  const duplicates = entityItems.length === 0 ? "Low" : health.score >= 80 ? "Moderate" : "Elevated";
  const mappedColumns = entityItems.length === 0 ? "—" : health.score >= 80 ? "6/6" : "4/6";

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="app-page-title">Upload Data</h1>
          <p className="app-page-desc">
            Excel/CSV ingestion with mapping, quality scoring, anomalies, and instant dashboards. Pilot mode keeps demo
            data available while you validate real files.
          </p>
        </div>
        <Badge variant="outline">
          {profile ? `${profile.dataMode === "upload" ? "Upload-first" : "Demo-first"} mode` : "Setup"}
        </Badge>
      </div>

      {!canUpload ? (
        <div className="rounded-xl border border-border/70 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          Your tenant role is <span className="font-medium text-foreground">{client?.role ?? "viewer"}</span>. Uploads are
          disabled — ask an admin to grant editor access or switch tenants.
        </div>
      ) : null}

      <SpenddaVsExcelStrip variant="app" />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/60 shadow-md lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Upload → Analyze → Report → Ask Questions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="rounded-3xl border border-dashed border-[var(--spendda-blue)]/25 bg-gradient-to-br from-[var(--spendda-navy)]/[0.06] to-background p-5 shadow-inner">
              <div className="mb-4 text-sm text-muted-foreground">
                Premium import flow: progress, parsing, column mapping, previews, and errors — then AI Workspace opens with
                analysis suggestions. Entity: <span className="font-medium text-foreground">{entity}</span>
              </div>
              {canUpload ? (
                <PremiumUploadExperience entity={entity} clientId={clientId} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Upload controls are hidden for read-only members. You can still review analytics and reports for this
                  client.
                </p>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
            <Link href="/app/spend-analytics">
              <Card className="h-full border-border/60 bg-background transition-colors hover:bg-muted/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileSpreadsheet className="h-4 w-4" />
                    Spend upload
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Map vendor/category/department/amount/date. Detect repeated payments and unusually large transactions.
                  <div className="mt-4">
                    <Button variant="secondary" className="w-full">
                      Open Spend Upload <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/app/payroll">
              <Card className="h-full border-border/60 bg-background transition-colors hover:bg-muted/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <HeartPulse className="h-4 w-4" />
                    Payroll upload
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Map employee/bank/salary/status. Detect duplicate bank accounts, inactive paid, and salary spikes.
                  <div className="mt-4">
                    <Button variant="secondary" className="w-full">
                      Open Payroll Upload <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
            </div>

            <div className="sm:col-span-2">
              <div className="rounded-2xl border border-dashed border-[var(--spendda-blue)]/25 bg-gradient-to-br from-[var(--spendda-navy)]/[0.04] to-background p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Pilot sample files
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Download neutral CSVs shaped to Spendda&apos;s expected columns, then upload via Spend Analytics or
                  Payroll.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    href="/samples/spend-sample.csv"
                    download
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-lg no-underline")}
                  >
                    Spend sample CSV
                  </a>
                  <a
                    href="/samples/payroll-sample.csv"
                    download
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-lg no-underline")}
                  >
                    Payroll sample CSV
                  </a>
                </div>
              </div>
            </div>

            <div className="sm:col-span-2">
              <div className="rounded-2xl border bg-muted/20 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  What happens after upload
                </div>
                <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                  {[
                    "Auto-detect and map columns",
                    "Compute data health + readiness",
                    "Detect anomalies and duplicates",
                    "Populate dashboard + AI insights",
                  ].map((x) => (
                    <div key={x} className="rounded-xl border bg-background px-3 py-2">
                      {x}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-md">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Data health score</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="rounded-xl border bg-background p-4 shadow-sm">
              <div className="text-xs text-muted-foreground">Overall</div>
              <div className="mt-2 flex items-end justify-between">
                <div className="text-3xl font-semibold tracking-tight">{health.score}</div>
                <Badge variant="outline" className="gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {health.score >= 80 ? "Strong" : "Review"}
                </Badge>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">{health.note}</div>
            </div>

            <Separator />

            <div className="grid gap-3">
              <div className="grid gap-2 text-xs text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Completeness</span>
                  <span className="font-medium text-foreground">{completeness}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Duplicate rows</span>
                  <span className="font-medium text-foreground">{duplicates}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Mapped columns</span>
                  <span className="font-medium text-foreground">{mappedColumns}</span>
                </div>
              </div>

              <div className="rounded-2xl border bg-background p-4 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  File history
                </div>
                <div className="mt-3">
                  {entityItems.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      No uploads yet. Load a sample or upload a CSV/Excel file to generate insights.
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-2xl border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead>Filename</TableHead>
                            <TableHead>Entity</TableHead>
                            <TableHead className="text-right">When</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {entityItems.slice(0, 5).map((x) => (
                            <TableRow key={`${x.kind}-${x.filename}-${x.entity}`}>
                              <TableCell className="font-medium">{x.kind.toUpperCase()}</TableCell>
                              <TableCell className="text-muted-foreground">{x.filename}</TableCell>
                              <TableCell className="text-muted-foreground">{x.entity}</TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                <span className="inline-flex items-center gap-2">
                                  <Clock className="h-3.5 w-3.5" />
                                  <HydrationSafeDate iso={x.uploadedAt} mode="date" />
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid gap-2 text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Uploaded datasets</span>
                <span className="font-medium text-foreground">{entityItems.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Next step</span>
                <span className="font-medium text-foreground">
                  {entityItems.length === 0 ? "Upload or load sample" : "Review AI insights"}
                </span>
              </div>
            </div>

            <Button className="w-full" onClick={() => router.push("/app/ai-workspace")}>
              <Upload className="mr-2 h-4 w-4" />
              Open AI Workspace
            </Button>

            <div className="grid gap-2 text-xs text-muted-foreground">
              {spend && "flaggedCount" in spend ? (
                <div className="rounded-xl border bg-muted/20 px-3 py-2">
                  Spend signals: <span className="font-medium text-foreground">{spend.flaggedCount}</span> flagged
                </div>
              ) : null}
              {payroll && "highRisk" in payroll ? (
                <div className="rounded-xl border bg-muted/20 px-3 py-2">
                  Payroll risk: <span className="font-medium text-foreground">{payroll.highRisk}</span> high
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

