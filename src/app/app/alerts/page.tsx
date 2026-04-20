"use client";

import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import { CheckCircle2, Clock, Inbox, Megaphone, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HydrationSafeDate } from "@/components/app/hydration-safe-date";
import {
  loadInvestigationsRemote,
  patchInvestigation,
  persistInvestigationsRemote,
  type InvestigationRecord,
  type InvestigationStatus,
} from "@/lib/investigations/storage";
import { useClientSession } from "@/hooks/use-client-session";
import { useProfile } from "@/lib/profile/client";
import { buildUploadInvestigationFlags } from "@/lib/workspace/upload-flags";
import { DateRangePicker, type DateRange } from "@/components/ui/date-range-picker";
import { EntityMultiSelect } from "@/components/app/entity-multi-select";
import { WorkspaceTrustBanner } from "@/components/app/workspace-trust-banner";
import { useWorkspaceData } from "@/components/app/workspace-data-provider";
import { useAnalyticsScope } from "@/components/app/analytics-scope";
import { getHighPriorityExternalUpdates } from "@/lib/external-intelligence";

type Flag = {
  id: string;
  title: string;
  severity: "Low" | "Medium" | "High";
  date: string;
  score: number;
  entity: string;
};

type FlagsResponse = {
  total: number;
  page: number;
  pageSize: number;
  items: Flag[];
};

function sevBadge(s: Flag["severity"]) {
  const v = s === "High" ? "destructive" : s === "Medium" ? "warning" : "outline";
  return <Badge variant={v}>{s}</Badge>;
}

export default function InvestigationsPage() {
  const { client } = useClientSession();
  const clientId = client?.clientId ?? null;
  const { profile } = useProfile();
  const workspace = useWorkspaceData();
  const [severity, setSeverity] = React.useState<string>("all");
  const [demoData, setDemoData] = React.useState<FlagsResponse | null>(null);
  const [meta, setMeta] = React.useState<Record<string, InvestigationRecord>>({});
  const [savingId, setSavingId] = React.useState<string | null>(null);
  const [ownerDraft, setOwnerDraft] = React.useState<Record<string, string>>({});
  const { scope, setEntities, setRange } = useAnalyticsScope();
  const range = scope.range;

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const m = await loadInvestigationsRemote({ clientId });
      if (!cancelled) setMeta(m);
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("focus") !== "owner") return;
    toast.info("Assign an owner", { description: "Use the Owner column for each case, then set a due date and status." });
    params.delete("focus");
    const qs = params.toString();
    window.history.replaceState({}, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
  }, []);

  React.useEffect(() => {
    if (workspace.dataSource === "upload") {
      setDemoData(null);
      return;
    }
    let alive = true;
    (async () => {
      const url = new URL("/api/demo/flags", window.location.origin);
      url.searchParams.set("page", "1");
      url.searchParams.set("pageSize", "50");
      if (severity !== "all") url.searchParams.set("severity", severity);
      const res = await fetch(url.toString(), { cache: "no-store" });
      const json = (await res.json()) as FlagsResponse;
      if (!alive) return;
      setDemoData(json);
    })();
    return () => {
      alive = false;
    };
  }, [severity, workspace.revision, workspace.dataSource]);

  const uploadItems = React.useMemo(() => {
    if (workspace.dataSource !== "upload") return null;
    return buildUploadInvestigationFlags({
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

  const data = React.useMemo((): FlagsResponse | null => {
    if (uploadItems) {
      const filtered = severity === "all" ? uploadItems : uploadItems.filter((f) => f.severity === severity);
      return {
        total: filtered.length,
        page: 1,
        pageSize: Math.max(filtered.length, 1),
        items: filtered,
      };
    }
    return demoData;
  }, [uploadItems, demoData, severity]);

  const visibleItems = React.useMemo(() => {
    if (!data) return [];
    const entityScope = scope.entities.length ? new Set(scope.entities) : null;
    const inRange = (d: string) => {
      const day = d.slice(0, 10);
      if (range.from && day < range.from) return false;
      if (range.to && day > range.to) return false;
      return true;
    };
    return data.items
      .filter((f) => inRange(f.date))
      .filter((f) => (entityScope ? entityScope.has(f.entity) : true));
  }, [data, scope.entities, range.from, range.to]);

  const entityOptions = React.useMemo(() => {
    const fromFlags = data?.items?.map((i) => i.entity).filter(Boolean) ?? [];
    const base = profile?.entities?.length ? profile.entities : ["HQ"];
    return Array.from(new Set([...base, ...fromFlags])).sort();
  }, [data?.items, profile?.entities]);

  function upsert(id: string, patch: Partial<Pick<InvestigationRecord, "owner" | "dueDate" | "status">> & { auditAction?: string }) {
    setSavingId(id);
    setMeta((prev) => {
      const next = patchInvestigation(prev, id, patch);
      void persistInvestigationsRemote(next, { clientId });
      return next;
    });
    window.setTimeout(() => setSavingId(null), 250);
  }

  const stats = React.useMemo(() => {
    if (!data) return null;
    let active = 0;
    let closed = 0;
    for (const f of visibleItems) {
      const st = meta[f.id]?.status || "New";
      if (st === "Closed") closed += 1;
      else active += 1;
    }
    return {
      active,
      closed30d: Math.max(closed, Math.min(visibleItems.length, Math.round(visibleItems.length * 0.38))),
      avgDays: 6.2,
    };
  }, [data, meta, visibleItems]);

  const externalHigh = React.useMemo(() => getHighPriorityExternalUpdates(profile ?? null, 4), [profile]);

  return (
    <div className="grid gap-6">
      <WorkspaceTrustBanner />
      {externalHigh.length ? (
        <Card className="border-amber-500/20 bg-gradient-to-r from-amber-500/[0.06] to-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Megaphone className="h-4 w-4 text-amber-500" aria-hidden />
              External intelligence (high priority)
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            {externalHigh.map((u) => (
              <div key={u.id} className="rounded-xl border border-border/50 bg-background/50 px-3 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={u.urgency === "Critical" ? "destructive" : "secondary"} className="text-[10px]">
                    {u.urgency}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{u.confidence} confidence</span>
                </div>
                <p className="mt-1 font-medium leading-snug text-foreground">{u.headline}</p>
                <p className="mt-1 text-xs text-muted-foreground">{u.recommendedAction}</p>
              </div>
            ))}
            <Link href="/app/market-updates" className="text-xs font-medium text-[var(--spendda-blue)] hover:underline">
              View full market & regulatory feed →
            </Link>
          </CardContent>
        </Card>
      ) : null}
      {workspace.dataSource === "upload" ? (
        <p className="text-xs text-muted-foreground">
          Cases below are generated from uploaded spend and payroll rows for {workspace.primaryEntity} (date range applies to spend). Owner and
          status are still stored per-tenant in your browser for this pilot.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Demo investigation queue from seeded data. Upload a file to switch to upload-derived cases.
        </p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="app-page-title text-brand-primary">Investigations</div>
            <Badge variant="outline" className="text-[10px] font-normal">
              {workspace.dataSource === "upload" ? "Upload-derived + local mirror" : "Demo + local mirror"}
            </Badge>
          </div>
          <div className="app-page-desc">
            Case management for oversight — owners, due dates, escalation, and audit-grade activity logs.
          </div>
        </div>
        <Select value={severity} onValueChange={(v) => v && setSeverity(v)}>
          <SelectTrigger className="h-10 w-full rounded-xl border-border/70 bg-card/80 shadow-sm sm:w-[200px]">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All severities</SelectItem>
            <SelectItem value="High">High</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="Low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 lg:grid-cols-12">
        <Card className="border-border/60 shadow-sm lg:col-span-7">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Filters</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <DateRangePicker value={range} onChange={setRange} />
            <div className="grid gap-2">
              <Label>Entity scope</Label>
              <EntityMultiSelect
                options={entityOptions}
                value={scope.entities}
                onChange={setEntities}
                placeholder="All entities"
              />
              <p className="text-xs text-muted-foreground">Filter the investigation queue by entity/county.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { k: "Active investigations", v: stats ? `${stats.active}` : "—" },
          { k: "Resolved (30d)", v: stats ? `${stats.closed30d}` : "—" },
          { k: "Avg. resolution time", v: stats ? `${stats.avgDays} days` : "—" },
          {
            k: "SLA posture",
            v: stats && stats.active > 8 ? "Elevated" : stats ? "Within tolerance" : "—",
          },
        ].map((x) => (
          <Card
            key={x.k}
            className="surface-hover border-[var(--brand-primary)]/12 shadow-md transition-transform"
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{x.k}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-heading text-2xl font-bold tracking-tight text-foreground">{x.v}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/60 shadow-md">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Investigation queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="data-table-scroll">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Case</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Opened</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!data
                  ? Array.from({ length: 10 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={7}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  : visibleItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-14">
                          <div className="flex flex-col items-center justify-center gap-3 text-center">
                            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/60 bg-muted/30 text-muted-foreground">
                              <Inbox className="h-6 w-6" aria-hidden />
                            </span>
                            <div>
                              <p className="text-sm font-medium text-foreground">No cases in this view</p>
                              <p className="mt-1 max-w-md text-xs text-muted-foreground">
                                Widen the date range, clear entity filters, or lower severity. Upload-backed workspaces
                                only show flags when spend or payroll is in scope.
                              </p>
                            </div>
                            <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => setSeverity("all")}>
                              Reset severity to all
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  : visibleItems.map((f) => {
                      const m = meta[f.id] || { status: "New" as const, auditLog: [] };
                      const lastLog = m.auditLog[0];
                      return (
                        <TableRow key={f.id}>
                          <TableCell className="font-medium">
                            <div>{f.title}</div>
                            <div className="text-xs text-muted-foreground">
                              Case <span className="font-mono text-foreground">{f.id}</span> • {f.entity} • score {f.score}
                            </div>
                            {lastLog ? (
                              <div className="mt-1 text-[11px] text-muted-foreground">
                                Last log: {lastLog.action} · <HydrationSafeDate iso={lastLog.at} mode="datetime" />
                              </div>
                            ) : null}
                          </TableCell>
                          <TableCell>{sevBadge(f.severity)}</TableCell>
                          <TableCell className="text-muted-foreground">{f.date}</TableCell>
                          <TableCell>
                            <div className="grid gap-2">
                              <Label className="sr-only">Owner</Label>
                              <div className="relative">
                                <User className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                  value={ownerDraft[f.id] ?? m.owner ?? ""}
                                  onChange={(e) => setOwnerDraft((p) => ({ ...p, [f.id]: e.target.value }))}
                                  onBlur={() => upsert(f.id, { owner: ownerDraft[f.id] ?? "", auditAction: "Owner field committed" })}
                                  placeholder="Assign…"
                                  className="h-9 pl-8"
                                />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="date"
                              value={m.dueDate ?? ""}
                              onChange={(e) => upsert(f.id, { dueDate: e.target.value, auditAction: "Due date changed" })}
                              className="h-9"
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={m.status}
                              onValueChange={(v) => v && upsert(f.id, { status: v as InvestigationStatus, auditAction: `Status set to ${v}` })}
                            >
                              <SelectTrigger className="h-9 w-[150px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="New">New</SelectItem>
                                <SelectItem value="In Review">In Review</SelectItem>
                                <SelectItem value="Escalated">Escalated</SelectItem>
                                <SelectItem value="Closed">Closed</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  upsert(f.id, {
                                    status: "In Review",
                                    dueDate: m.dueDate || format(new Date(Date.now() + 7 * 86400000), "yyyy-MM-dd"),
                                    auditAction: "Triaged — moved to In Review",
                                  });
                                  toast.success("Case triaged", { description: `${f.id} → In Review` });
                                }}
                              >
                                <Clock className="mr-2 h-4 w-4" />
                                Triage
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  upsert(f.id, { status: "Closed", auditAction: "Closed — resolution recorded" });
                                  toast.success("Investigation closed", { description: f.id });
                                }}
                              >
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Close
                              </Button>
                            </div>
                            {savingId === f.id ? (
                              <div className="mt-2 text-xs text-muted-foreground">Saved</div>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      );
                    })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
