"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Building2, Palette, ScrollText, Shield, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useClientSession } from "@/hooks/use-client-session";
import { tenantRoleCan } from "@/lib/tenants/permissions";
import { Switch } from "@/components/ui/switch";
import { PLAN_LIMITS, planAllowsFeature } from "@/lib/tenants/subscription";
import type { TenantPlanTier } from "@/lib/tenants/types";
import { writeTenantBrandingLocal } from "@/lib/tenants/tenant-branding";
import type { PortalAuditEntry } from "@/lib/tenants/portal-audit-types";

type BrandingGet = {
  tenantName: string;
  planTier: TenantPlanTier;
  role?: string;
  branding: { portalDisplayName?: string; accentHex?: string; footerNote?: string };
};

export default function TenantPortalSettingsPage() {
  const { client, portal, mounted } = useClientSession();
  const [loading, setLoading] = React.useState(true);
  const [payload, setPayload] = React.useState<BrandingGet | null>(null);
  const [audit, setAudit] = React.useState<PortalAuditEntry[]>([]);
  const [usage, setUsage] = React.useState<{ period: string; exports: number; uploadBytes: number } | null>(null);

  const [displayName, setDisplayName] = React.useState("");
  const [accentHex, setAccentHex] = React.useState("");
  const [footerNote, setFooterNote] = React.useState("");
  const [fiscalStart, setFiscalStart] = React.useState(1);
  const [supportEmail, setSupportEmail] = React.useState("");
  const [wmDefault, setWmDefault] = React.useState(false);

  const canWrite = tenantRoleCan(client?.role, "tenant.branding.write");
  const canSettingsWrite = tenantRoleCan(client?.role, "tenant.settings.write");
  const canAudit = tenantRoleCan(client?.role, "tenant.audit.read");
  const canUsage = tenantRoleCan(client?.role, "tenant.usage.read");
  const tier = client?.planTier ?? payload?.planTier ?? "pilot";
  const limits = PLAN_LIMITS[tier];

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const bRes = await fetch("/api/tenants/branding", { cache: "no-store" });
      if (bRes.ok) {
        const j = (await bRes.json()) as BrandingGet;
        setPayload(j);
        setDisplayName(j.branding.portalDisplayName ?? "");
        setAccentHex(j.branding.accentHex ?? "");
        setFooterNote(j.branding.footerNote ?? "");
      } else {
        setPayload(null);
      }

      const sRes = await fetch("/api/tenants/settings", { cache: "no-store" });
      if (sRes.ok) {
        const sj = (await sRes.json()) as {
          operational?: {
            fiscalYearStartMonth?: number;
            supportContactEmail?: string;
            defaultConfidentialWatermark?: boolean;
          };
        };
        const op = sj.operational ?? {};
        if (typeof op.fiscalYearStartMonth === "number" && op.fiscalYearStartMonth >= 1 && op.fiscalYearStartMonth <= 12) {
          setFiscalStart(op.fiscalYearStartMonth);
        }
        if (op.supportContactEmail !== undefined) setSupportEmail(op.supportContactEmail ?? "");
        if (typeof op.defaultConfidentialWatermark === "boolean") setWmDefault(op.defaultConfidentialWatermark);
      }

      if (tenantRoleCan(client?.role, "tenant.audit.read")) {
        const aRes = await fetch("/api/tenants/portal-audit", { cache: "no-store" });
        if (aRes.ok) {
          const j = (await aRes.json()) as { items?: PortalAuditEntry[] };
          setAudit(j.items ?? []);
        } else setAudit([]);
      } else setAudit([]);

      if (tenantRoleCan(client?.role, "tenant.usage.read")) {
        const usRes = await fetch("/api/tenants/usage", { cache: "no-store" });
        if (usRes.ok) setUsage(await usRes.json());
        else setUsage(null);
      } else setUsage(null);
    } catch {
      toast.error("Could not load tenant settings");
    } finally {
      setLoading(false);
    }
  }, [client?.role]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onSaveWorkspaceDefaults() {
    if (!canSettingsWrite) return;
    try {
      const res = await fetch("/api/tenants/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fiscalYearStartMonth: fiscalStart,
          supportContactEmail: supportEmail.trim() || "",
          defaultConfidentialWatermark: wmDefault,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(typeof j.error === "string" ? j.error : "Request failed");
      toast.success("Workspace defaults saved");
      void refresh();
    } catch (e) {
      toast.error("Save failed", { description: e instanceof Error ? e.message : "Try again." });
    }
  }

  async function onSaveBranding() {
    if (!canWrite) return;
    try {
      const res = await fetch("/api/tenants/branding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          portalDisplayName: displayName || undefined,
          accentHex: accentHex || undefined,
          footerNote: footerNote || undefined,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(typeof j.error === "string" ? j.error : "Request failed");
      toast.success("Portal branding saved");
      if (client?.clientId) {
        writeTenantBrandingLocal(client.clientId, {
          portalDisplayName: displayName || undefined,
          accentHex: accentHex || undefined,
          footerNote: footerNote || undefined,
        });
      }
      void refresh();
    } catch (e) {
      toast.error("Save failed", { description: e instanceof Error ? e.message : "Try again." });
    }
  }

  if (!mounted) return null;

  return (
    <div className="grid max-w-4xl gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href="/app/settings"
          className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to settings
        </Link>
        <h1 className="app-page-title">Client portal</h1>
        <p className="app-page-desc">
          Brand this workspace for your organization, review admin-only audit events, and see usage signals that map cleanly
          to future billing meters.
        </p>
        {!portal ? (
          <p className="text-sm text-muted-foreground">
            Turn on portal mode after selecting a tenant to unlock the full client workspace experience.
          </p>
        ) : null}
      </div>

      <Card className="border-border/60 shadow-md">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            Subscription readiness
          </CardTitle>
          <Badge variant="outline">{loading ? "…" : tier}</Badge>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-muted-foreground">
          <p>
            Plan tier drives in-app gates (for example Excel exports on{" "}
            <span className="font-medium text-foreground">Growth</span> and above). Stripe or a billing provider can update{" "}
            <code className="rounded bg-muted px-1 text-xs">tenants.plan_tier</code> when you wire production checkout.
          </p>
          <ul className="list-disc space-y-1 pl-5 text-foreground/90">
            <li>AI Workspace: {planAllowsFeature(tier, "ai.workspace") ? "included" : "limited"}</li>
            <li>Excel exports: {planAllowsFeature(tier, "exports.xlsx") ? "included" : "upgrade"}</li>
            <li>Full intelligence narrative: {planAllowsFeature(tier, "intelligence.full") ? "included" : "pilot summary"}</li>
          </ul>
          <p className="text-xs">
            Pilot packaging targets roughly {limits.maxUploadMbPerMonth} MB of uploads per month and {limits.maxSeats} seats
            — tune in <span className="font-medium text-foreground">PLAN_LIMITS</span> for go-to-market experiments.
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="h-4 w-4 text-muted-foreground" />
            Branding
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="portal-name">Portal display name</Label>
            <Input
              id="portal-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={payload?.tenantName ?? "Shown in sidebar and PDF cover"}
              disabled={!canWrite || loading}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="accent">Accent color (#RRGGBB)</Label>
            <Input
              id="accent"
              value={accentHex}
              onChange={(e) => setAccentHex(e.target.value)}
              placeholder="#3B82F6"
              disabled={!canWrite || loading}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="footer">Footer note (exports / emails)</Label>
            <Textarea
              id="footer"
              value={footerNote}
              onChange={(e) => setFooterNote(e.target.value)}
              placeholder="Confidential — internal oversight use only."
              disabled={!canWrite || loading}
              rows={3}
            />
          </div>
          <Button type="button" onClick={() => void onSaveBranding()} disabled={!canWrite || loading}>
            Save branding
          </Button>
          {!canWrite ? (
            <p className="text-xs text-muted-foreground">Only Owner or Finance Lead can change portal branding.</p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            Workspace defaults
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <p className="text-sm text-muted-foreground">
            Stored on the tenant record for everyone in this workspace. Reporting UIs can read these values as you wire
            deeper automation.
          </p>
          <div className="grid gap-2">
            <Label htmlFor="fy-start">Fiscal year starts (month 1–12)</Label>
            <Input
              id="fy-start"
              type="number"
              min={1}
              max={12}
              value={fiscalStart}
              onChange={(e) => setFiscalStart(Math.min(12, Math.max(1, Number(e.target.value) || 1)))}
              disabled={!canSettingsWrite || loading}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="support-mail">Support contact email (optional)</Label>
            <Input
              id="support-mail"
              type="email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              placeholder="finance@company.com"
              disabled={!canSettingsWrite || loading}
            />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/10 px-3 py-2">
            <div className="grid gap-0.5">
              <span className="text-sm font-medium">Default confidential watermark on exports</span>
              <span className="text-xs text-muted-foreground">Users can still override per export where supported.</span>
            </div>
            <Switch checked={wmDefault} onCheckedChange={setWmDefault} disabled={!canSettingsWrite || loading} />
          </div>
          <Button type="button" onClick={() => void onSaveWorkspaceDefaults()} disabled={!canSettingsWrite || loading}>
            Save workspace defaults
          </Button>
          {!canSettingsWrite ? (
            <p className="text-xs text-muted-foreground">Only Owner or Finance Lead can edit workspace defaults.</p>
          ) : null}
        </CardContent>
      </Card>

      {canAudit ? (
        <Card className="border-border/60 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ScrollText className="h-4 w-4 text-muted-foreground" />
              Audit log
            </CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}>
              Refresh
            </Button>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            {audit.length === 0 ? (
              <p className="text-muted-foreground">No events yet. Exports and branding changes append here for admins.</p>
            ) : (
              <ul className="divide-y divide-border/60 rounded-xl border border-border/60">
                {audit.map((a, i) => (
                  <li key={`${a.ts}-${i}`} className="flex flex-col gap-0.5 px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="font-normal">
                        {a.action}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{a.ts}</span>
                    </div>
                    {a.detail ? <p className="text-xs text-muted-foreground">{a.detail}</p> : null}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-muted-foreground">
              Prototype entries are stored in-process; production should persist to Postgres or your SIEM.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {canUsage ? (
        <Card className="border-border/60 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4 text-muted-foreground" />
              Usage (this month)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {usage ? (
              <div className="grid gap-1">
                <div>
                  <span className="font-medium text-foreground">Period:</span> {usage.period}
                </div>
                <div>
                  <span className="font-medium text-foreground">Exports recorded:</span> {usage.exports}
                </div>
                <div>
                  <span className="font-medium text-foreground">Upload bytes (tracked):</span> {usage.uploadBytes}
                </div>
              </div>
            ) : (
              <p>No usage counters yet.</p>
            )}
            <Separator className="my-3" />
            <p className="text-xs">
              Client exports call <code className="rounded bg-muted px-1">/api/tenants/usage</code> — swap the handler for
              warehouse billing rollups when you are ready.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
