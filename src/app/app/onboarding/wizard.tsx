"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Building2,
  Check,
  Globe2,
  Heart,
  Layers,
  Lock,
  Server,
  Shield,
  Upload,
  Users,
} from "lucide-react";

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
import { DEMO_PACKS } from "@/lib/profile/demo-packs";
import { safePostAuthPath } from "@/lib/safe-redirect";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type SmeOrgOption = {
  value: OrgType;
  label: string;
  description: string;
  icon: React.ReactNode;
  demoPackId: DemoPackId;
  marketType: MarketType;
  industrySegment: IndustrySegment;
  operatingLocation: OperatingLocation;
  orgSize: OrgSize;
};

const smeOrgTypes: SmeOrgOption[] = [
  {
    value: "Home Care Agency",
    label: "Home care agency",
    description: "Caregiver pay, client billing, cash runway",
    icon: <Heart className="h-4 w-4" />,
    demoPackId: "home-care-us",
    marketType: "Developed Market",
    industrySegment: "Home care & senior services",
    operatingLocation: "United States — Home Care",
    orgSize: "Small",
  },
  {
    value: "Childcare Center",
    label: "Childcare center",
    description: "Staff ratios, subsidy billing, payroll by center",
    icon: <Users className="h-4 w-4" />,
    demoPackId: "childcare-us",
    marketType: "Developed Market",
    industrySegment: "Childcare & early education",
    operatingLocation: "United States — Childcare",
    orgSize: "Small",
  },
  {
    value: "Restaurant Group",
    label: "Restaurant / food service",
    description: "Location comparison, labor cost %, food cost",
    icon: <Building2 className="h-4 w-4" />,
    demoPackId: "restaurant-us",
    marketType: "Developed Market",
    industrySegment: "Food & beverage",
    operatingLocation: "United States — Restaurant",
    orgSize: "Mid-size",
  },
  {
    value: "SME",
    label: "Small business (general)",
    description: "Vendor spend, payroll health, monthly clarity",
    icon: <Layers className="h-4 w-4" />,
    demoPackId: "sme-us",
    marketType: "Developed Market",
    industrySegment: "Small business (general)",
    operatingLocation: "United States — SME",
    orgSize: "Small",
  },
  {
    value: "NGO",
    label: "NGO / nonprofit",
    description: "Donor reporting, grant tracking, spend oversight",
    icon: <Globe2 className="h-4 w-4" />,
    demoPackId: "global-ngo-relief",
    marketType: "Emerging Market",
    industrySegment: "Nonprofit & NGOs",
    operatingLocation: "Global / multi-region",
    orgSize: "Mid-size",
  },
  {
    value: "Hospital",
    label: "Hospital / clinic",
    description: "Payroll compliance, vendor spend, department P&L",
    icon: <Building2 className="h-4 w-4" />,
    demoPackId: "mercy-regional-hospital",
    marketType: "Developed Market",
    industrySegment: "Healthcare & life sciences",
    operatingLocation: "United States",
    orgSize: "Mid-size",
  },
  {
    value: "University",
    label: "School / university",
    description: "Campus budgets, payroll variance, vendor contracts",
    icon: <Building2 className="h-4 w-4" />,
    demoPackId: "east-africa-university",
    marketType: "Developed Market",
    industrySegment: "Education & research",
    operatingLocation: "United States",
    orgSize: "Mid-size",
  },
  {
    value: "Government",
    label: "Government / public sector",
    description: "Accountability, audit trails, procurement oversight",
    icon: <Shield className="h-4 w-4" />,
    demoPackId: "liberia-mof",
    marketType: "Emerging Market",
    industrySegment: "Public sector & regulators",
    operatingLocation: "West Africa",
    orgSize: "Multi-entity",
  },
];

type GoalRow = { goal: PrimaryGoal; label: string };

function goalsForOrgType(orgType: OrgType): GoalRow[] {
  if (orgType === "Home Care Agency") {
    return [
      { goal: "Payroll oversight", label: "Payroll vs revenue ratio" },
      { goal: "Workforce planning", label: "Caregiver overtime patterns" },
      { goal: "Multi-branch visibility", label: "Client billing & overdue invoices" },
      { goal: "Budget forecasting", label: "Cash runway" },
      { goal: "Fraud / anomaly detection", label: "Anomaly & duplicate detection" },
      { goal: "Executive reporting", label: "Monthly financial report" },
    ];
  }
  if (orgType === "Childcare Center") {
    return [
      { goal: "Workforce planning", label: "Staff cost per enrolled child" },
      { goal: "Donor fund accountability", label: "Subsidy payment tracking" },
      { goal: "Payroll oversight", label: "Payroll by center" },
      { goal: "Fraud / anomaly detection", label: "Anomaly & duplicate detection" },
      { goal: "Executive reporting", label: "Monthly financial report" },
      { goal: "Procurement savings", label: "Compliance & licensing costs" },
    ];
  }
  if (orgType === "Restaurant Group") {
    return [
      { goal: "Multi-branch visibility", label: "Location performance comparison" },
      { goal: "Payroll oversight", label: "Labor cost %" },
      { goal: "Procurement savings", label: "Food cost & vendor spend" },
      { goal: "Fraud / anomaly detection", label: "Anomaly & duplicate detection" },
      { goal: "Executive reporting", label: "Monthly financial report" },
      { goal: "Budget forecasting", label: "Cash position" },
    ];
  }
  return [
    { goal: "Procurement savings", label: "Vendor spend overview" },
    { goal: "Payroll oversight", label: "Payroll health" },
    { goal: "Budget forecasting", label: "Cash position" },
    { goal: "Fraud / anomaly detection", label: "Anomaly & duplicate detection" },
    { goal: "Executive reporting", label: "Monthly financial report" },
    { goal: "Donor fund accountability", label: "Executive reporting" },
    { goal: "Workforce planning", label: "Budget vs actual" },
    { goal: "Multi-branch visibility", label: "Multi-location visibility" },
  ];
}

const ROLE_OPTIONS: { label: string; value: UserRole }[] = [
  { label: "Owner / Operator", value: "Admin" },
  { label: "Finance Lead", value: "Finance Lead" },
  { label: "Executive", value: "Executive" },
  { label: "Analyst", value: "Analyst" },
  { label: "Auditor", value: "Auditor" },
];

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
  const [orgType, setOrgType] = React.useState<OrgType>("Home Care Agency");
  const [marketType, setMarketType] = React.useState<MarketType>("Developed Market");
  const [orgSize, setOrgSize] = React.useState<OrgSize>("Small");
  const [primaryGoals, setPrimaryGoals] = React.useState<PrimaryGoal[]>(["Payroll oversight", "Workforce planning"]);
  const [dataMode, setDataMode] = React.useState<"upload" | "demo">("demo");
  const [demoPackId, setDemoPackId] = React.useState<DemoPackId>("home-care-us");
  const [industrySegment, setIndustrySegment] = React.useState<IndustrySegment>("Home care & senior services");
  const [operatingLocation, setOperatingLocation] = React.useState<OperatingLocation>("United States — Home Care");
  const [role, setRole] = React.useState<UserRole>("Admin");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const activeGoalRows = React.useMemo(() => goalsForOrgType(orgType), [orgType]);

  React.useEffect(() => {
    const firstTwo = goalsForOrgType(orgType)
      .slice(0, 2)
      .map((r) => r.goal);
    setPrimaryGoals(firstTwo);
  }, [orgType]);

  const entities = React.useMemo(() => {
    if (orgSize !== "Multi-entity") return ["HQ"];
    if (orgType === "Government") return ["HQ", "Region A", "Region B", "County 1", "County 2"];
    if (orgType === "University") return ["Main Campus", "Campus 1", "Campus 2"];
    return ["HQ", "Region A", "Region B"];
  }, [orgSize, orgType]);

  const canNext =
    (step === 1 && Boolean(orgType)) ||
    (step === 2 && Boolean(role)) ||
    (step === 3 && primaryGoals.length > 0) ||
    (step === 4 && Boolean(dataMode));

  function applyOrgOption(opt: SmeOrgOption) {
    setOrgType(opt.value);
    setDemoPackId(opt.demoPackId);
    setMarketType(opt.marketType);
    setIndustrySegment(opt.industrySegment);
    setOperatingLocation(opt.operatingLocation);
    setOrgSize(opt.orgSize);
  }

  function goContinue() {
    setStep((s) => Math.min(4, s + 1));
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

  const demoPackLabel = DEMO_PACKS.find((p) => p.id === demoPackId)?.label ?? demoPackId;
  const industryLabel = industrySegment;

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-lg font-semibold tracking-tight text-white">Set up your workspace</div>
          <div className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-300">
            Four quick questions and you&apos;re in. We&apos;ll set up your dashboard, AI, and reports to match your business.
          </div>
        </div>
        <Badge variant="outline" className="w-fit border-white/15 bg-white/5 text-slate-200">
          Under two minutes
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["Your business", 1],
            ["Your role", 2],
            ["Your goals", 3],
            ["Get started", 4],
          ] as Array<[string, number]>
        ).map(([label, n]) => (
          <StepPill key={label} label={label} active={step === n} done={step > n} />
        ))}
      </div>

      <Card className="border-white/10 bg-slate-950/60 text-white shadow-[0_30px_120px_rgba(2,6,23,0.55)] backdrop-blur">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl tracking-[-0.02em] text-white">
            {step === 1
              ? "What kind of business do you run?"
              : step === 2
                ? "What's your role?"
                : step === 3
                  ? "What do you want to track?"
                  : "How do you want to begin?"}
          </CardTitle>
          <div className="text-sm leading-relaxed text-slate-300">
            {step === 1
              ? "We'll set up your workspace with the right language, metrics, and demo data for your industry."
              : step === 2
                ? "We'll adjust what you see first — owners get summaries, analysts get full data access."
                : step === 3
                  ? "Pick everything that matters. We'll highlight these in your dashboard and AI responses."
                  : "You can switch between your own data and the demo at any time."}
          </div>
        </CardHeader>
        <CardContent className="grid gap-5">
          {step === 1 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {smeOrgTypes.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => applyOrgOption(opt)}
                  className={[
                    "flex items-start justify-between gap-3 rounded-2xl border px-4 py-4 text-left motion-safe:transition-[border-color,background-color,transform] motion-safe:duration-200 motion-safe:active:scale-[0.99]",
                    orgType === opt.value
                      ? "border-blue-400/30 bg-blue-500/10"
                      : "border-white/10 bg-white/5 hover:bg-white/[0.07]",
                  ].join(" ")}
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="rounded-xl border border-white/10 bg-slate-950/60 p-2 text-slate-200">{opt.icon}</div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white">{opt.label}</div>
                      <div className="mt-1 text-xs leading-relaxed text-slate-400">{opt.description}</div>
                    </div>
                  </div>
                  {orgType === opt.value ? <Check className="h-4 w-4 shrink-0 text-blue-200" /> : null}
                </button>
              ))}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="flex flex-wrap gap-2">
              {ROLE_OPTIONS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  className={[
                    "rounded-full border px-4 py-2.5 text-sm font-semibold transition-all",
                    role === r.value
                      ? "border-blue-400/30 bg-blue-500/10 text-blue-100"
                      : "border-white/10 bg-slate-950/40 text-slate-300 hover:bg-white/[0.07]",
                  ].join(" ")}
                >
                  {r.label}
                </button>
              ))}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {activeGoalRows.map((row) => {
                const active = primaryGoals.includes(row.goal);
                return (
                  <button
                    key={row.goal + row.label}
                    type="button"
                    onClick={() =>
                      setPrimaryGoals((prev) => (active ? prev.filter((x) => x !== row.goal) : [...prev, row.goal]))
                    }
                    className={[
                      "flex items-center justify-between rounded-2xl border px-4 py-4 text-left transition-all",
                      active
                        ? "border-blue-400/30 bg-blue-500/10"
                        : "border-white/10 bg-white/5 hover:bg-white/[0.07]",
                    ].join(" ")}
                  >
                    <div className="text-sm font-semibold leading-snug text-white">{row.label}</div>
                    {active ? <Check className="h-4 w-4 shrink-0 text-blue-200" /> : null}
                  </button>
                );
              })}
            </div>
          ) : null}

          {step === 4 ? (
            <div className="grid gap-4">
              <div className="grid gap-3 lg:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setDataMode("upload")}
                  className={[
                    "rounded-2xl border px-4 py-4 text-left transition-all",
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
                        <div className="font-semibold">Upload my own files</div>
                        <div className="mt-1 text-sm text-slate-300">
                          Drop in a CSV or Excel file — QuickBooks export, Gusto payroll, Square report, or any spreadsheet.
                          Takes under 5 minutes.
                        </div>
                      </div>
                    </div>
                    {dataMode === "upload" ? <Check className="h-4 w-4 shrink-0 text-blue-200" /> : null}
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
                        <div className="font-semibold">Explore with sample data</div>
                        <div className="mt-1 text-sm text-slate-300">
                          See exactly what Spendda shows with realistic data for your industry — no file needed.
                        </div>
                      </div>
                    </div>
                    {dataMode === "demo" ? <Check className="h-4 w-4 shrink-0 text-blue-200" /> : null}
                  </div>
                </button>
              </div>

              <div className="rounded-xl border border-blue-400/25 bg-blue-500/10 px-4 py-3 text-sm text-blue-50">
                <span className="font-medium">Your demo:</span> {demoPackLabel} — showing realistic {industryLabel}{" "}
                data
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
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
              {step < 4 ? (
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
                  {saving ? "Saving…" : "Open my workspace →"}
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
