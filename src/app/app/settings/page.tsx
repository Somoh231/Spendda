"use client";

import * as React from "react";
import { z } from "zod";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import Link from "next/link";
import { Bell, Brush, Database, Plug, Save, ShieldCheck, Users } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { SwitchRow } from "@/components/ui/switch-row";
import { APP_VERSION } from "@/lib/version";
import { useProfile } from "@/lib/profile/client";
import type { DemoPackId, IndustrySegment, OperatingLocation, OrgType, UserRole } from "@/lib/profile/types";
import { INDUSTRY_SEGMENTS, OPERATING_LOCATIONS } from "@/lib/profile/types";
import { DEMO_PACKS } from "@/lib/profile/demo-packs";
import { persistProfileToServer } from "@/lib/profile/persist-server";
import {
  defaultIndustrySegmentFromOrgType,
  defaultOperatingLocationFromProfile,
} from "@/lib/profile/segment-location";
import { useClientSession } from "@/hooks/use-client-session";
import {
  DATA_RETENTION_PRESETS,
  isDataRetentionPreset,
  readDataRetentionLocal,
  retentionLabel,
  writeDataRetentionLocal,
  type DataRetentionPreset,
} from "@/lib/trust/data-retention";

const SWITCHABLE_ROLES: UserRole[] = ["Admin", "Finance Lead", "Executive", "Auditor", "Analyst"];

const schema = z.object({
  organizationName: z.string().min(2),
  sector: z.enum(["Government", "Enterprise", "NGO", "Bank"]),
  currency: z.string().min(3).max(3),
  notifyFlags: z.boolean(),
  notifyReports: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

function orgTypeToSector(org: OrgType): z.infer<typeof schema>["sector"] {
  if (org === "Private Company") return "Enterprise";
  if (org === "Government" || org === "NGO" || org === "Bank") return org;
  return "Enterprise";
}

function sectorToOrgType(sector: z.infer<typeof schema>["sector"]): OrgType {
  return sector === "Enterprise" ? "Private Company" : sector;
}

export default function SettingsPage() {
  const { profile, setProfile } = useProfile();
  const { client } = useClientSession();
  const [retention, setRetention] = React.useState<DataRetentionPreset>("90");

  React.useEffect(() => {
    setRetention(readDataRetentionLocal(client?.clientId ?? null));
  }, [client?.clientId]);

  React.useEffect(() => {
    const scrollToHash = () => {
      const id = window.location.hash.replace(/^#/, "");
      if (!id) return;
      window.requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    };
    scrollToHash();
    window.addEventListener("hashchange", scrollToHash);
    return () => window.removeEventListener("hashchange", scrollToHash);
  }, []);

  const [saved, setSaved] = React.useState(false);
  const [entities, setEntities] = React.useState<string[]>(["HQ", "Region A", "Region B"]);
  const [newEntity, setNewEntity] = React.useState("");
  const [demoPackId, setDemoPackId] = React.useState<DemoPackId>("default");
  const [industrySegment, setIndustrySegment] = React.useState<IndustrySegment>(
    () => defaultIndustrySegmentFromOrgType("Government"),
  );
  const [operatingLocation, setOperatingLocation] = React.useState<OperatingLocation>(() =>
    defaultOperatingLocationFromProfile({ marketType: "Emerging Market", demoPackId: "default" }),
  );
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      organizationName: "Demo Ministry of Finance",
      sector: "Government",
      currency: "USD",
      notifyFlags: true,
      notifyReports: true,
    },
  });
  const sector = useWatch({ control: form.control, name: "sector" });
  const notifyFlags = useWatch({ control: form.control, name: "notifyFlags" });
  const notifyReports = useWatch({
    control: form.control,
    name: "notifyReports",
  });

  React.useEffect(() => {
    if (!profile) return;
    setEntities(profile.entities?.length ? [...profile.entities] : ["HQ"]);
    form.setValue("sector", orgTypeToSector(profile.orgType));
    if (profile.demoPackId) setDemoPackId(profile.demoPackId);
    setIndustrySegment(profile.industrySegment ?? defaultIndustrySegmentFromOrgType(profile.orgType));
    setOperatingLocation(
      profile.operatingLocation ?? defaultOperatingLocationFromProfile(profile),
    );
  }, [profile, form]);

  async function onSubmit(values: FormValues) {
    setSaved(false);
    if (!profile) {
      toast.error("No profile", { description: "Complete onboarding first." });
      return;
    }
    const orgType = sectorToOrgType(values.sector);
    const active =
      entities.includes(profile.activeEntity) && profile.activeEntity
        ? profile.activeEntity
        : entities[0] || profile.activeEntity;
    const next = {
      ...profile,
      orgType,
      entities: entities.length ? entities : profile.entities,
      activeEntity: active,
      demoPackId,
      industrySegment,
      operatingLocation,
    };
    try {
      await persistProfileToServer(next);
      setProfile(next);
      setSaved(true);
      toast.success("Settings saved", { description: "Profile synced for demo analytics and this browser session." });
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      toast.error("Could not sync profile", {
        description: e instanceof Error ? e.message : "Try again or re-run onboarding.",
      });
    }
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="app-page-title">Settings</h1>
        <p className="app-page-desc">
          Branding, entities, roles, and notification settings. Pilot builds persist profile data in this browser only.
        </p>
      </div>

      <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
        <Card id="profile" className="scroll-mt-24 border-border/60 shadow-md">
          <CardHeader>
            <CardTitle className="text-base">Pilot profile</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              Signed in as <span className="font-medium text-foreground">Demo User</span>
              {profile ? (
                <>
                  {" "}
                  · Role <span className="font-medium text-foreground">{profile.role}</span> · Active entity{" "}
                  <span className="font-medium text-foreground">{profile.activeEntity}</span>
                </>
              ) : (
                <> · Complete onboarding to sync the top bar.</>
              )}
            </p>
            <p className="mt-2 text-xs">
              Changes to role and entities below update the workspace switcher immediately when a profile exists.
            </p>
          </CardContent>
        </Card>

        <Card id="integrations" className="scroll-mt-24 border-border/60 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Plug className="h-4 w-4 text-muted-foreground" />
              Integrations
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              QuickBooks, Xero, payroll, banking, and ERP connectors are planned. Manual uploads stay the primary
              workflow until sync is enabled.
            </p>
            <Link
              href="/app/settings/integrations"
              className={cn(buttonVariants({ variant: "outline" }), "shrink-0 rounded-xl")}
            >
              View integrations
            </Link>
          </CardContent>
        </Card>

        <Card id="client-portal" className="scroll-mt-24 border-border/60 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              Multi-tenant client portal
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Per-tenant branding, admin audit trail, usage counters, and plan gates for a production-style client
              workspace.
            </p>
            <Link
              href="/app/settings/tenant"
              className={cn(buttonVariants({ variant: "outline" }), "shrink-0 rounded-xl")}
            >
              Open client portal
            </Link>
          </CardContent>
        </Card>

        <Card id="data-retention" className="scroll-mt-24 border-border/60 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4 text-muted-foreground" />
              Data retention & audit
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            <p className="text-sm text-muted-foreground">
              Retention preference for this workspace in the browser (pilot). Enterprise maps this to your records policy,
              legal hold, and automated purge jobs in the primary database.
            </p>
            <div className="grid max-w-xs gap-2">
              <Label htmlFor="retention-select">Default retention for workspace artifacts</Label>
              <Select
                value={retention}
                onValueChange={(v) => {
                  if (!v || !isDataRetentionPreset(v)) return;
                  setRetention(v);
                  writeDataRetentionLocal(client?.clientId ?? null, v);
                  toast.success("Retention saved", { description: retentionLabel(v) });
                }}
              >
                <SelectTrigger id="retention-select" className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATA_RETENTION_PRESETS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {retentionLabel(p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 border-t border-border/60 pt-4 text-sm">
              <span className="font-medium text-foreground">Audit trail</span>
              <p className="text-muted-foreground">
                Tenant admins can review export and governance events in the client portal (when enabled).
              </p>
              <Link
                href="/app/settings/tenant"
                className={cn(buttonVariants({ variant: "outline" }), "w-fit rounded-xl")}
              >
                Open audit & usage
              </Link>
            </div>
            <div className="grid gap-2 text-sm">
              <span className="font-medium text-foreground">Role permissions</span>
              <p className="text-muted-foreground">
                Tenant roles (owner, admin, member, viewer) control uploads, exports, and admin-only surfaces alongside
                your in-product persona.
              </p>
              <Link
                href="/trust"
                className="w-fit text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Trust center (buyer documentation) →
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card id="organization-settings" className="scroll-mt-24 border-border/60 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Brush className="h-4 w-4 text-muted-foreground" />
              Branding & organization
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="orgName">Organization name</Label>
              <Input id="orgName" {...form.register("organizationName")} />
              {form.formState.errors.organizationName?.message ? (
                <div className="text-xs text-destructive">
                  {form.formState.errors.organizationName.message}
                </div>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label>Sector type</Label>
              <Select
                value={sector}
                onValueChange={(v) => {
                  if (!v) return;
                  form.setValue("sector", v as FormValues["sector"]);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select sector" />
                </SelectTrigger>
                <SelectContent>
                  {["Government", "Enterprise", "NGO", "Bank"].map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Currency</Label>
              <Input {...form.register("currency")} placeholder="USD" />
              {form.formState.errors.currency?.message ? (
                <div className="text-xs text-destructive">
                  {form.formState.errors.currency.message}
                </div>
              ) : null}
            </div>
            <div className="sm:col-span-2">
              <div className="rounded-2xl border bg-muted/20 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">Compliance posture</div>
                  <Badge variant="outline" className="gap-1">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Enterprise-ready
                  </Badge>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Access controls, auditable workflows, and export packs are enabled by default in this prototype.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-md">
          <CardHeader>
            <CardTitle className="text-base">Demo narrative pack</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <p className="text-sm text-muted-foreground">
              Changes the synthetic organization name, seed, and surfaced alerts across all demo APIs — ideal for
              investor and pilot storytelling.
            </p>
            <Select
              value={demoPackId}
              onValueChange={(v) => v && setDemoPackId(v as DemoPackId)}
              disabled={!profile}
            >
              <SelectTrigger className="max-w-xl rounded-xl">
                <SelectValue placeholder="Select demo pack" />
              </SelectTrigger>
              <SelectContent>
                {DEMO_PACKS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {DEMO_PACKS.find((p) => p.id === demoPackId)?.description}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-md">
          <CardHeader>
            <CardTitle className="text-base">Market & regulatory targeting</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Industry segment</Label>
              <Select
                value={industrySegment}
                onValueChange={(v) => v && setIndustrySegment(v as IndustrySegment)}
                disabled={!profile}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRY_SEGMENTS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Fine-tunes external intelligence beyond organization type alone.
              </p>
            </div>
            <div className="grid gap-2">
              <Label>Primary operating location</Label>
              <Select
                value={operatingLocation}
                onValueChange={(v) => v && setOperatingLocation(v as OperatingLocation)}
                disabled={!profile}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {OPERATING_LOCATIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Coarse jurisdiction bucket for policy and rate alerts (not legal advice).
              </p>
            </div>
          </CardContent>
        </Card>

        <Card id="notifications" className="scroll-mt-24 border-border/60 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4 text-muted-foreground" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <SwitchRow
              title="Flag alerts"
              description="Notify when high-risk anomalies are detected."
              checked={notifyFlags}
              onCheckedChange={(v) => form.setValue("notifyFlags", v)}
            />
            <SwitchRow
              title="Report delivery"
              description="Notify when AI briefs are generated or updated."
              checked={notifyReports}
              onCheckedChange={(v) => form.setValue("notifyReports", v)}
            />
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-muted-foreground" />
              Entities & roles
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Role</Label>
              <Select
                value={profile?.role ?? "Admin"}
                onValueChange={(v) => {
                  if (!v || !profile) return;
                  setProfile({ ...profile, role: v as UserRole });
                }}
                disabled={!profile}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {SWITCHABLE_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">
                Matches the top bar role switcher and sidebar visibility for pilot demos.
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Add entity</Label>
              <div className="flex gap-2">
                <Input
                  value={newEntity}
                  onChange={(e) => setNewEntity(e.target.value)}
                  placeholder="e.g. Campus 1, Branch D"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => {
                    const v = newEntity.trim();
                    if (!v) return;
                    if (entities.includes(v)) return;
                    const next = [...entities, v];
                    setEntities(next);
                    setNewEntity("");
                    if (profile) {
                      setProfile({
                        ...profile,
                        entities: next,
                        activeEntity: profile.activeEntity,
                      });
                    }
                  }}
                >
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {entities.map((e) => (
                  <Badge key={e} variant="outline" className="gap-1">
                    {e}
                  </Badge>
                ))}
              </div>
              <div className="text-xs text-muted-foreground">
                Entities are used by the top-bar switcher and Benchmarks comparisons.
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button type="submit" className="rounded-xl shadow-sm">
            <Save className="mr-2 h-4 w-4" />
            Save changes
          </Button>
          {saved ? (
            <div className="text-sm font-medium text-[hsl(var(--success))]">Saved.</div>
          ) : null}
        </div>
      </form>

      <Card className="border-dashed border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">About this release</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Spendda Pilot v{APP_VERSION} — stable build for evaluation. All analytics in this environment use demo or
          uploaded sample data unless your organization connects production sources.
        </CardContent>
      </Card>
    </div>
  );
}

