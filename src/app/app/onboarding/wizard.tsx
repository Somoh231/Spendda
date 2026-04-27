"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Building2, Check, Globe2, Layers, Lock, Server, Shield, Upload } from "lucide-react";

import type {
  DemoPackId,
  IndustrySegment,
  MarketType,
  OnboardingProfile,
  OperatingLocation,
  OrgSize,
  OrgType,
  PrimaryGoal,
  UserRole,
} from "@/lib/profile/types";
import { INDUSTRY_SEGMENTS, OPERATING_LOCATIONS } from "@/lib/profile/types";
import { DEMO_PACKS } from "@/lib/profile/demo-packs";
import {
  defaultIndustrySegmentFromOrgType,
  defaultOperatingLocationFromProfile,
} from "@/lib/profile/segment-location";
import { safePostAuthPath } from "@/lib/safe-redirect";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const orgTypes: { value: OrgType; icon: React.ReactNode }[] = [
  { value: "Government", icon: <Shield className="h-4 w-4" /> },
  { value: "Private Company", icon: <Building2 className="h-4 w-4" /> },
  { value: "University", icon: <Building2 className="h-4 w-4" /> },
  { value: "NGO", icon: <Globe2 className="h-4 w-4" /> },
  { value: "Hospital", icon: <Building2 className="h-4 w-4" /> },
  { value: "Bank", icon: <Building2 className="h-4 w-4" /> },
];

const marketTypes: MarketType[] = ["Emerging Market", "Developed Market"];
const orgSizes: OrgSize[] = ["Small", "Mid-size", "Large", "Multi-entity"];

const goals: PrimaryGoal[] = [
  "Payroll oversight",
  "Procurement savings",
  "Budget forecasting",
  "Fraud / anomaly detection",
  "Executive reporting",
  "Donor fund accountability",
  "Workforce planning",
  "Multi-branch visibility",
];

const roles: UserRole[] = ["Admin", "Finance Lead", "Executive", "Auditor", "Analyst"];

function StepPill({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <div
      className={[
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold motion-safe:transition-[border-color,background-color,color,transform] motion-safe:duration-200 motion-safe:ease-out",
        active
          ? "border-blue-400/30 bg-blue-500/10 text-blue-100"
          : done
            ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-100"
            : "border-white/10 bg-white/5 text-slate-300",
      ].join(" ")}
    >
      {done ? (
        <Check className="h-3.5 w-3.5" />
      ) : (
        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      )}
      {label}
    </div>
  );
}

export function OnboardingWizard() {
  const router = useRouter();
  const search = useSearchParams();
  const redirectTo = safePostAuthPath(search.get("redirectTo"), "/app/ai-workspace");

  const [step, setStep] = React.useState(1);
  const [orgType, setOrgType] = React.useState<OrgType>("Government");
  const [marketType, setMarketType] = React.useState<MarketType>("Emerging Market");
  const [orgSize, setOrgSize] = React.useState<OrgSize>("Multi-entity");
  const [primaryGoals, setPrimaryGoals] = React.useState<PrimaryGoal[]>([
    "Fraud / anomaly detection",
    "Executive reporting",
  ]);
  const [dataMode, setDataMode] = React.useState<"upload" | "demo">("demo");
  const [demoPackId, setDemoPackId] = React.useState<DemoPackId>("liberia-mof");
  const [industrySegment, setIndustrySegment] = React.useState<IndustrySegment>(() =>
    defaultIndustrySegmentFromOrgType("Government"),
  );
  const [operatingLocation, setOperatingLocation] = React.useState<OperatingLocation>(() =>
    defaultOperatingLocationFromProfile({ marketType: "Emerging Market", demoPackId: "liberia-mof" }),
  );
  const [role, setRole] = React.useState<UserRole>("Finance Lead");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const entities = React.useMemo(() => {
    if (orgSize !== "Multi-entity") return ["HQ"];
    if (orgType === "Government") return ["HQ", "Region A", "Region B", "County 1", "County 2"];
    if (orgType === "University") return ["Main Campus", "Campus 1", "Campus 2"];
    if (orgType === "Bank") return ["HQ", "Branch A", "Branch B", "Branch C"];
    return ["HQ", "Region A", "Region B"];
  }, [orgSize, orgType]);

  const canNext =
    (step === 1 && Boolean(orgType)) ||
    (step === 2 && Boolean(marketType)) ||
    (step === 3 && Boolean(industrySegment) && Boolean(operatingLocation)) ||
    (step === 4 && Boolean(orgSize)) ||
    (step === 5 && primaryGoals.length > 0) ||
    (step === 6 && Boolean(dataMode));

  function goContinue() {
    if (step === 2) {
      setIndustrySegment(defaultIndustrySegmentFromOrgType(orgType));
      setOperatingLocation(defaultOperatingLocationFromProfile({ marketType, demoPackId }));
    }
    setStep((s) => Math.min(6, s + 1));
  }

  async function saveProfile() {
    setSaving(true);
    setError(null);
    const profile: OnboardingProfile = {
      orgType,
      marketType,
      orgSize,
      primaryGoals,
      dataMode,
      demoPackId,
      industrySegment,
      operatingLocation,
      role,
      entities,
      activeEntity: entities[0] || "HQ",
      createdAt: new Date().toISOString(),
    };
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!res.ok) {
        let message = "We couldn’t save your profile. Check your connection and try again.";
        try {
          const j = (await res.json()) as { error?: string; issues?: { path: (string | number)[]; message: string }[] };
          if (Array.isArray(j.issues) && j.issues.length > 0) {
            message = j.issues
              .slice(0, 3)
              .map((i) => `${i.path.join(".")}: ${i.message}`)
              .join(" · ");
          } else if (j.error) message = j.error;
        } catch {
          /* keep default */
        }
        throw new Error(message);
      }
      // Local profile cache is tenant-scoped by `useProfile()`; keep legacy write for backward compatibility.
      window.localStorage.setItem("spendda_profile_v1", JSON.stringify(profile));
      // Ensure Set-Cookie (spendda_profile) is committed before entering protected routes.
      window.location.href = redirectTo;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-lg font-semibold tracking-tight text-white">Calibrate your workspace</div>
          <div className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-300">
            Six decisions—org model, market, segment, scale, outcomes, and data path. Spendda then tunes language,
            entities, and demo narrative so the first screen feels like your program, not a generic template.
          </div>
        </div>
        <Badge variant="outline" className="w-fit border-white/15 bg-white/5 text-slate-200">
          Under two minutes
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["Organization", 1],
            ["Market", 2],
            ["Segment", 3],
            ["Scale", 4],
            ["Outcomes", 5],
            ["Data path", 6],
          ] as Array<[string, number]>
        ).map(([label, n]) => (
          <StepPill key={label} label={label} active={step === n} done={step > n} />
        ))}
      </div>

      <Card className="border-white/10 bg-slate-950/60 text-white shadow-[0_30px_120px_rgba(2,6,23,0.55)] backdrop-blur">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl tracking-[-0.02em] text-white">
            {step === 1
              ? "Who is this workspace for?"
              : step === 2
                ? "Which macro environment shapes your risk?"
                : step === 3
                  ? "Where do you operate—and which lens matters?"
                  : step === 4
                    ? "How complex is the footprint?"
                    : step === 5
                      ? "What outcomes must this pilot prove?"
                      : "How do you want to start—with your files or ours?"}
          </CardTitle>
          <div className="text-sm leading-relaxed text-slate-300">
            {step === 1
              ? "We adapt labels, benchmarks, and sample entities to match public sector, enterprise, NGO, or banking norms."
              : step === 2
                ? "Emerging vs developed markets change regulatory feeds and external intelligence emphasis."
                : step === 3
                  ? "Industry and geography tune market signals and default KPI language. Defaults follow your org and market—you can refine anytime."
                : step === 4
                  ? "Entity lists and roll-up behavior follow how many sites, branches, or counties you run."
                  : step === 5
                    ? "Pick every outcome you care about this quarter. We weight dashboards, alerts, and AI prompts toward those priorities."
                    : step === 6
                      ? "Upload when you have sanitized exports ready; demo data is best for a first investor or leadership walkthrough."
                    : "You can change this later in Settings."}
          </div>
        </CardHeader>
        <CardContent className="grid gap-5">
          {step === 1 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {orgTypes.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setOrgType(t.value)}
                  className={[
                    "flex items-center justify-between rounded-2xl border px-4 py-4 text-left motion-safe:transition-[border-color,background-color,transform] motion-safe:duration-200 motion-safe:active:scale-[0.99]",
                    orgType === t.value
                      ? "border-blue-400/30 bg-blue-500/10"
                      : "border-white/10 bg-white/5 hover:bg-white/[0.07]",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl border border-white/10 bg-slate-950/60 p-2 text-slate-200">
                      {t.icon}
                    </div>
                    <div className="font-semibold">{t.value}</div>
                  </div>
                  {orgType === t.value ? <Check className="h-4 w-4 text-blue-200" /> : null}
                </button>
              ))}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {marketTypes.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMarketType(m)}
                  className={[
                    "flex items-center justify-between rounded-2xl border px-4 py-4 text-left transition-all",
                    marketType === m
                      ? "border-blue-400/30 bg-blue-500/10"
                      : "border-white/10 bg-white/5 hover:bg-white/[0.07]",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl border border-white/10 bg-slate-950/60 p-2 text-slate-200">
                      <Globe2 className="h-4 w-4" />
                    </div>
                    <div className="font-semibold">{m}</div>
                  </div>
                  {marketType === m ? <Check className="h-4 w-4 text-blue-200" /> : null}
                </button>
              ))}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="grid gap-6">
              <div className="grid gap-2">
                <div className="text-sm font-semibold text-white">Industry segment</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {INDUSTRY_SEGMENTS.map((seg) => (
                    <button
                      key={seg}
                      type="button"
                      onClick={() => setIndustrySegment(seg)}
                      className={[
                        "rounded-2xl border px-3 py-3 text-left text-sm transition-all",
                        industrySegment === seg
                          ? "border-blue-400/30 bg-blue-500/10"
                          : "border-white/10 bg-white/5 hover:bg-white/[0.07]",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="leading-snug text-slate-100">{seg}</span>
                        {industrySegment === seg ? <Check className="h-4 w-4 shrink-0 text-blue-200" /> : null}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-2">
                <div className="text-sm font-semibold text-white">Primary operating location</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {OPERATING_LOCATIONS.map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setOperatingLocation(loc)}
                      className={[
                        "rounded-2xl border px-3 py-3 text-left text-sm transition-all",
                        operatingLocation === loc
                          ? "border-blue-400/30 bg-blue-500/10"
                          : "border-white/10 bg-white/5 hover:bg-white/[0.07]",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="leading-snug text-slate-100">{loc}</span>
                        {operatingLocation === loc ? <Check className="h-4 w-4 shrink-0 text-blue-200" /> : null}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {orgSizes.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setOrgSize(s)}
                  className={[
                    "flex items-center justify-between rounded-2xl border px-4 py-4 text-left transition-all",
                    orgSize === s
                      ? "border-blue-400/30 bg-blue-500/10"
                      : "border-white/10 bg-white/5 hover:bg-white/[0.07]",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl border border-white/10 bg-slate-950/60 p-2 text-slate-200">
                      <Layers className="h-4 w-4" />
                    </div>
                    <div className="font-semibold">{s}</div>
                  </div>
                  {orgSize === s ? <Check className="h-4 w-4 text-blue-200" /> : null}
                </button>
              ))}
            </div>
          ) : null}

          {step === 5 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {goals.map((g) => {
                const active = primaryGoals.includes(g);
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() =>
                      setPrimaryGoals((prev) => (active ? prev.filter((x) => x !== g) : [...prev, g]))
                    }
                    className={[
                      "flex items-center justify-between rounded-2xl border px-4 py-4 text-left transition-all",
                      active
                        ? "border-blue-400/30 bg-blue-500/10"
                        : "border-white/10 bg-white/5 hover:bg-white/[0.07]",
                    ].join(" ")}
                  >
                    <div className="font-semibold">
                      {g === "Fraud / anomaly detection" ? "Fraud detection" : g}
                    </div>
                    {active ? <Check className="h-4 w-4 text-blue-200" /> : null}
                  </button>
                );
              })}
            </div>
          ) : null}

          {step === 6 ? (
            <div className="grid gap-4 lg:grid-cols-3">
              <button
                type="button"
                onClick={() => setDataMode("upload")}
                className={[
                  "rounded-2xl border px-4 py-4 text-left transition-all lg:col-span-2",
                  dataMode === "upload"
                    ? "border-blue-400/30 bg-blue-500/10"
                    : "border-white/10 bg-white/5 hover:bg-white/[0.07]",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl border border-white/10 bg-slate-950/60 p-2 text-slate-200">
                      <Upload className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-semibold">Bring your own files</div>
                      <div className="mt-1 text-sm text-slate-300">
                        CSV or Excel with guided mapping, health scoring, and dashboards that stay tied to source rows.
                      </div>
                    </div>
                  </div>
                  {dataMode === "upload" ? <Check className="h-4 w-4 text-blue-200" /> : null}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDataMode("demo")}
                className={[
                  "rounded-2xl border px-4 py-4 text-left transition-all",
                  dataMode === "demo"
                    ? "border-blue-400/30 bg-blue-500/10"
                    : "border-white/10 bg-white/5 hover:bg-white/[0.07]",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl border border-white/10 bg-slate-950/60 p-2 text-slate-200">
                      <Shield className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-semibold">Run the pilot dataset</div>
                      <div className="mt-1 text-sm text-slate-300">
                        Curated synthetic spend and payroll with flags, forecasts, and executive briefs—ideal for a first
                        board rehearsal.
                      </div>
                    </div>
                  </div>
                  {dataMode === "demo" ? <Check className="h-4 w-4 text-blue-200" /> : null}
                </div>
              </button>

              <div className="grid gap-3 lg:col-span-3">
                <div className="text-sm font-semibold text-white">Demo narrative pack</div>
                <div className="text-xs leading-relaxed text-slate-400">
                  Choose a storyline that matches your buyer conversation—sector naming, seeded alerts, and benchmark
                  tone shift instantly (and coexist with real uploads when you add them).
                </div>
                {(() => {
                  const US_IDS = new Set(["home-care-us", "childcare-us", "restaurant-us", "sme-us"]);
                  const us = DEMO_PACKS.filter((p) => US_IDS.has(p.id));
                  const inst = DEMO_PACKS.filter((p) => !US_IDS.has(p.id));
                  const tagFor = (id: string) =>
                    id === "home-care-us"
                      ? { text: "Home Care", cls: "bg-blue-500/15 text-blue-100 border-blue-400/30" }
                      : id === "childcare-us"
                        ? { text: "Childcare", cls: "bg-emerald-500/15 text-emerald-100 border-emerald-400/30" }
                        : id === "restaurant-us"
                          ? { text: "Restaurant", cls: "bg-orange-500/15 text-orange-100 border-orange-400/30" }
                          : { text: "Small Business", cls: "bg-purple-500/15 text-purple-100 border-purple-400/30" };
                  const bulletsFor = (id: string) =>
                    id === "home-care-us"
                      ? [
                          "Payroll running at 67% of revenue — above 60% target",
                          "$14,200 in overdue client invoices",
                          "Evening shift overtime up 18% this month",
                        ]
                      : id === "childcare-us"
                        ? [
                            "Center 2 staff cost per child 22% above Center 1",
                            "$8,400 in subsidy payments delayed 30+ days",
                            "Part-time hours spiked last week — review scheduling",
                          ]
                        : id === "restaurant-us"
                          ? [
                              "Airport location 24% below group average revenue",
                              "Labor cost at 36% — above 30% benchmark at Westside",
                              "Duplicate invoice from food supplier — $1,240",
                            ]
                          : [
                              "Top 3 vendors = 61% of all spend",
                              "Payroll up 11% vs same month last year",
                              "2 potential duplicate payments flagged",
                            ];

                  const Card = ({ p, warm }: { p: (typeof DEMO_PACKS)[number]; warm?: boolean }) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setDemoPackId(p.id)}
                      className={[
                        "rounded-2xl border px-3 py-3 text-left text-sm transition-all",
                        warm ? "bg-amber-50/30 dark:bg-amber-950/20 border-amber-500/20" : "border-white/10 bg-white/5 hover:bg-white/[0.07]",
                        demoPackId === p.id ? "ring-1 ring-blue-400/25" : "",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-white">{p.label}</div>
                          <div className="mt-1 text-xs leading-5 text-slate-400">{p.description}</div>
                        </div>
                        {warm ? (
                          <span className={["shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold", tagFor(p.id).cls].join(" ")}>
                            {tagFor(p.id).text}
                          </span>
                        ) : null}
                      </div>
                      {warm ? (
                        <ul className="mt-2 space-y-1 text-xs text-slate-300">
                          {bulletsFor(p.id).map((b) => (
                            <li key={b}>• {b}</li>
                          ))}
                        </ul>
                      ) : null}
                    </button>
                  );

                  return (
                    <div className="grid gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-white/10" />
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">🇺🇸 US Business Demos</div>
                        <div className="h-px flex-1 bg-white/10" />
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {us.map((p) => (
                          <Card key={p.id} p={p} warm />
                        ))}
                      </div>

                      <div className="flex items-center gap-3 pt-2">
                        <div className="h-px flex-1 bg-white/10" />
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                          🌍 Public Sector & Institutional Demos
                        </div>
                        <div className="h-px flex-1 bg-white/10" />
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {inst.map((p) => (
                          <Card key={p.id} p={p} />
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 lg:col-span-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white">Primary role</div>
                    <div className="mt-1 text-sm text-slate-300">
                      We tune navigation density and default surfaces so executives see summaries while analysts keep
                      upload and triage paths one click away.
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {roles.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        className={[
                          "rounded-full border px-3 py-1 text-xs font-semibold transition-all",
                          role === r
                            ? "border-blue-400/30 bg-blue-500/10 text-blue-100"
                            : "border-white/10 bg-slate-950/40 text-slate-300 hover:bg-white/[0.07]",
                        ].join(" ")}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
                <Separator className="my-4 bg-white/10" />
                <div className="text-xs text-slate-400">
                  Entities detected: <span className="text-slate-200">{entities.join(", ")}</span>
                </div>
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-xs text-rose-200">
              {error}
            </div>
          ) : null}

          <Separator className="bg-white/10" />

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="border-white/15 bg-white/5 text-white hover:bg-white/10"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              disabled={step === 1 || saving}
            >
              Back
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                onClick={() => router.push("/")}
                disabled={saving}
              >
                Leave setup
              </Button>
              {step < 6 ? (
                <Button
                  type="button"
                  onClick={goContinue}
                  disabled={!canNext || saving}
                  className="bg-gradient-to-r from-blue-500 to-blue-400 text-white shadow-[0_18px_60px_rgba(37,99,235,0.35)] transition-all hover:-translate-y-0.5 hover:from-blue-400 hover:to-blue-300"
                >
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={saveProfile}
                  disabled={!canNext || saving}
                  className="bg-gradient-to-r from-blue-500 to-blue-400 text-white shadow-[0_18px_60px_rgba(37,99,235,0.35)] transition-all hover:-translate-y-0.5 hover:from-blue-400 hover:to-blue-300"
                >
                  {saving ? "Saving…" : "Launch workspace"} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[11px] leading-relaxed text-slate-400">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 sm:justify-start">
            <span className="inline-flex items-center gap-1.5 text-slate-300">
              <Lock className="h-3.5 w-3.5 shrink-0 text-blue-300/90" aria-hidden />
              Encrypted sessions · tenant isolation
            </span>
            <span className="inline-flex items-center gap-1.5 text-slate-300">
              <Server className="h-3.5 w-3.5 shrink-0 text-emerald-300/80" aria-hidden />
              Profile stored for personalization
            </span>
            <span className="inline-flex items-center gap-1.5 text-slate-300">
              <Shield className="h-3.5 w-3.5 shrink-0 text-slate-200/90" aria-hidden />
              Enterprise-style controls in-product
            </span>
          </div>
          <span className="text-center text-slate-500 sm:text-right">You can revisit every choice in Settings.</span>
        </div>
      </div>
    </div>
  );
}

