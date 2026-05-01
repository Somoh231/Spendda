import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Briefcase,
  Building2,
  ChevronRight,
  Clock,
  Factory,
  FileBarChart,
  GraduationCap,
  HeartHandshake,
  Landmark,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Upload,
} from "lucide-react";

import { HomeFaq } from "@/components/marketing/home-faq";
import { HeroProductPreview } from "@/components/marketing/hero-product-preview";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { ProductScreenshots } from "@/components/marketing/product-screenshots";
import { TrustComplianceBadges } from "@/components/marketing/trust-badges";

const shell = "mx-auto max-w-7xl px-6 lg:px-8";
const label = "text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 sm:text-sm";
const card =
  "rounded-2xl border border-white/[0.12] bg-white/[0.025] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-300 ease-out motion-safe:hover:-translate-y-0.5 motion-safe:hover:border-blue-400/35 motion-safe:hover:shadow-[0_20px_50px_-12px_rgba(37,99,235,0.2)]";
const cardLink =
  "rounded-2xl border border-white/[0.12] bg-white/[0.025] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-300 ease-out motion-safe:hover:-translate-y-0.5 motion-safe:hover:border-blue-400/35 motion-safe:hover:bg-white/[0.04] motion-safe:hover:shadow-[0_20px_50px_-12px_rgba(37,99,235,0.2)]";
const reveal = "motion-safe:animate-fade-in-up";

const heroProof = [
  { icon: Shield, text: "We structure and clean your records — no CFO or data hire required" },
  { icon: Clock, text: "From first upload to reports you can run the business on — often under 10 minutes" },
  { icon: Target, text: "Paper exports and messy spreadsheets are welcome" },
] as const;

const logoPlaceholders = ["Home care", "Childcare", "Restaurants", "SMEs", "NGOs", "Schools"] as const;

const industrySolutions = [
  {
    title: "Home care & childcare",
    body: "Caregiver pay ratios, client billing gaps, subsidy payment delays, and cash runway — in one clear view.",
    icon: Factory,
    href: "/solutions",
  },
  {
    title: "Schools & districts",
    body: "Campus-level budgets, vendor contracts, and payroll variance with rollups leadership can trust.",
    icon: GraduationCap,
    href: "/solutions",
  },
  {
    title: "NGOs & foundations",
    body: "Grant-aligned reporting and donor-grade transparency without losing operational speed.",
    icon: HeartHandshake,
    href: "/solutions",
  },
  {
    title: "Finance & GRC teams",
    body: "Oversight layer on your ledgers: repeatable reporting, concentration signals, and audit-friendly exports — built from your real files, not placeholders.",
    icon: Briefcase,
    href: "/solutions",
  },
  {
    title: "Public sector",
    body: "Accountability, export trails, and briefings that survive scrutiny from oversight bodies.",
    icon: Landmark,
    href: "/solutions",
  },
  {
    title: "Multi-site operators",
    body: "Compare revenue, labor cost, and vendor spend across all your locations — see which one is underperforming and why.",
    icon: Building2,
    href: "/solutions",
  },
] as const;

const howSteps = [
  {
    step: "1",
    title: "Upload your files or records",
    body: "CSV, Excel, payroll, or exports — whatever you already have.",
    icon: Upload,
  },
  {
    step: "2",
    title: "We structure and clean your data",
    body: "No manual setup, no formatting headaches.",
    icon: Sparkles,
  },
  {
    step: "3",
    title: "Get reports, insights, and actions",
    body: "Ready to use, ready to share.",
    icon: FileBarChart,
  },
] as const;

const roiOutcomes = [
  {
    stat: "10×",
    label: "Hours saved monthly",
    detail:
      "Stop rebuilding summaries from scratch — one structured flow turns uploads into the reports and decisions your business needs.",
    icon: TrendingUp,
  },
  {
    stat: "−35%",
    label: "Earlier problem detection",
    detail:
      "Your oversight layer flags payroll drift, duplicate invoices, and billing gaps before they hit cash.",
    icon: Clock,
  },
  {
    stat: "100%",
    label: "Traceable to source rows",
    detail:
      "Every figure ties back to your records — a system you can defend, not numbers pulled from thin air.",
    icon: Shield,
  },
] as const;

const integrationChips = [
  "QuickBooks",
  "Xero",
  "Gusto",
  "ADP",
  "Excel",
  "CSV",
  "API-ready",
] as const;

const pricingPreview = [
  {
    name: "Starter",
    tag: "Prove it fast",
    blurb: "Single entity, uploads, reporting layer, AI Workspace, and core operational alerts.",
  },
  {
    name: "Growth",
    tag: "Scale oversight",
    blurb: "Multi-entity rollouts, reporting packs, investigations, priority support.",
    featured: true,
  },
  {
    name: "Enterprise",
    tag: "Program-grade",
    blurb: "Isolation, security reviews, integrations roadmap, named CSM.",
  },
] as const;

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(37,99,235,0.2),transparent_50%),radial-gradient(circle_at_100%_0%,rgba(16,185,129,0.1),transparent_35%),linear-gradient(180deg,#020617_0%,#030b18_55%,#020617_100%)]" />

      <MarketingNav />

      <main>
        {/* 1 — Hero */}
        <section className="relative overflow-hidden">
          <div
            className={`${shell} grid gap-8 pb-12 pt-10 sm:pb-14 sm:pt-11 lg:grid-cols-[1.02fr_0.98fr] lg:items-start lg:gap-10 lg:pb-16 lg:pt-12 ${reveal}`}
          >
            <div className="flex min-w-0 flex-col justify-center space-y-5">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-blue-400/35 bg-blue-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-blue-100 sm:text-xs">
                <BarChart3 className="h-3.5 w-3.5 shrink-0" />
                Data + finance infrastructure
              </div>
              <div className="space-y-3">
                <h1 className="max-w-[24ch] text-balance text-[2rem] font-semibold leading-[1.06] tracking-[-0.035em] text-white sm:text-4xl lg:text-[2.65rem] lg:leading-[1.04]">
                  Your data and finance team — without hiring one.
                </h1>
                <p className="max-w-xl text-pretty text-[0.9375rem] leading-relaxed text-slate-400 sm:text-lg">
                  Spendda transforms messy spreadsheets and paper records into a working data and financial system. Get clarity,
                  reports, and decisions without needing a CFO or data analyst.
                </p>
              </div>
              <div className="flex flex-col gap-2.5 pt-0.5 sm:flex-row sm:flex-wrap">
                <Link
                  href="/book-demo"
                  className="inline-flex h-11 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-blue-400 px-6 text-sm font-semibold text-white shadow-[0_14px_44px_rgba(37,99,235,0.38)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_18px_52px_rgba(37,99,235,0.48)]"
                >
                  Try free demo →
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <Link
                  href="/platform"
                  className="inline-flex h-11 items-center justify-center rounded-full border border-white/20 bg-white/[0.04] px-6 text-sm font-semibold text-white backdrop-blur transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[0.08]"
                >
                  See how it works
                </Link>
              </div>
              <ul className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap sm:gap-x-5 sm:gap-y-2">
                {heroProof.map((row) => {
                  const I = row.icon;
                  return (
                    <li key={row.text} className="flex items-center gap-2 text-xs text-slate-400 sm:text-sm">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-blue-200">
                        <I className="h-3.5 w-3.5" />
                      </span>
                      {row.text}
                    </li>
                  );
                })}
              </ul>
              <p className="text-xs leading-relaxed text-slate-500 sm:text-sm">
                Works with your existing tools — QuickBooks, payroll systems, spreadsheets, or paper records.
              </p>
            </div>
            <div className="min-w-0 lg:pt-0.5">
              <HeroProductPreview />
            </div>
          </div>
        </section>

        {/* 2 — Trusted by */}
        <section className={`border-y border-white/10 bg-white/[0.02] py-10 sm:py-12 ${reveal}`} style={{ animationDelay: "60ms" }}>
          <div className={`${shell} space-y-5`}>
            <p className={`${label} text-center text-slate-500`}>Trusted by operators who cannot afford surprises</p>
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              {logoPlaceholders.map((name) => (
                <div
                  key={name}
                  className="flex h-11 min-w-[6.5rem] items-center justify-center rounded-xl border border-white/10 bg-slate-900/50 px-4 text-[11px] font-semibold tracking-wide text-slate-500 transition-colors duration-300 hover:border-white/18 hover:text-slate-300"
                >
                  {name}
                </div>
              ))}
            </div>
            <p className="text-center text-xs text-slate-500">
              Logos shown as categories during pilot — reference customers available under NDA.
            </p>
          </div>
        </section>

        {/* 3 — Industry solutions */}
        <section className={`py-12 sm:py-14 ${reveal}`} style={{ animationDelay: "80ms" }}>
          <div className={`${shell} space-y-7`}>
            <div className="mx-auto max-w-2xl space-y-2 text-center">
              <p className={`${label} text-violet-400/90`}>BUILT FOR THESE BUSINESSES</p>
              <h2 className="text-balance text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl">
                Built for the businesses that run on spreadsheets.
              </h2>
              <p className="text-sm leading-relaxed text-slate-400 sm:text-base">
                Home care, childcare, restaurants, retail — Spendda adapts its language, metrics, and reports to match how
                you actually run your business.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
              {industrySolutions.map((row) => {
                const I = row.icon;
                return (
                  <Link
                    key={row.title}
                    href={row.href}
                    className={`group flex flex-col p-5 ${cardLink}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="inline-flex rounded-xl border border-white/[0.1] bg-white/[0.04] p-2.5 text-slate-100 transition-colors group-hover:border-blue-400/30">
                        <I className="h-5 w-5" />
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-600 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-blue-300" />
                    </div>
                    <h3 className="mt-3 text-base font-semibold text-white">{row.title}</h3>
                    <p className="mt-1.5 flex-1 text-sm leading-relaxed text-slate-400">{row.body}</p>
                    <span className="mt-3 text-xs font-semibold text-blue-300/95 group-hover:text-blue-200">
                      View solution patterns
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* 4 — How it works */}
        <section className={`border-t border-white/10 bg-white/[0.02] py-12 sm:py-14 ${reveal}`} style={{ animationDelay: "100ms" }}>
          <div className={`${shell} space-y-7`}>
            <div className="mx-auto max-w-2xl space-y-2 text-center">
              <p className={`${label} text-blue-400/90`}>How it works</p>
              <h2 className="text-balance text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl">
                From messy records to a working system — in minutes.
              </h2>
              <p className="text-sm text-slate-400 sm:text-base">
                Upload your records. We structure, clean, and turn them into a system you can actually run your business on.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3 md:gap-5">
              {howSteps.map((s) => {
                const I = s.icon;
                return (
                  <div key={s.title} className={`p-5 ${card}`}>
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.1] bg-slate-900/80 text-sm font-bold tabular-nums text-blue-200">
                      {s.step}
                    </div>
                    <div className="mt-3 inline-flex rounded-lg border border-white/[0.1] bg-blue-500/10 p-2 text-blue-200">
                      <I className="h-5 w-5" />
                    </div>
                    <h3 className="mt-3 text-base font-semibold leading-snug text-white">{s.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{s.body}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Before vs After — anchor + contrast */}
        <section className={`border-t border-white/10 py-12 sm:py-14 ${reveal}`} style={{ animationDelay: "110ms" }}>
          <div className={`${shell} space-y-8`}>
            <div className="mx-auto max-w-3xl space-y-3 text-center">
              <p className={`${label} text-violet-400/90`}>Before &amp; after Spendda</p>
              <h2 className="text-balance text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl">
                Spendda doesn&apos;t just analyze your data — it becomes the system you run your business on.
              </h2>
            </div>
            <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-2 md:gap-5">
              <div className={`p-5 ${card}`}>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Before</h3>
                <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-400">
                  <li>Scattered spreadsheets</li>
                  <li>Paper records</li>
                  <li>No clear reporting</li>
                  <li>Manual work</li>
                </ul>
              </div>
              <div className={`p-5 ${card}`}>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-300/90">After</h3>
                <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-400">
                  <li>Structured data system</li>
                  <li>Board-ready reports</li>
                  <li>Continuous visibility</li>
                  <li>Faster decisions</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* 5 — Product screenshots */}
        <section className={`py-12 sm:py-14 ${reveal}`} style={{ animationDelay: "120ms" }}>
          <div className={`${shell} space-y-6`}>
            <div className="mx-auto max-w-2xl space-y-2 text-center">
              <p className={`${label} text-emerald-400/90`}>Inside the product</p>
              <h2 className="text-balance text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl">
                What Spendda becomes for you
              </h2>
              <p className="text-sm text-slate-400 sm:text-base">
                Your reporting system, your financial oversight layer, your data infrastructure, and your decision engine — so
                you run the business from one structured place.
              </p>
            </div>
            <ProductScreenshots />
          </div>
        </section>

        {/* 6 — ROI outcomes */}
        <section className={`border-t border-white/10 py-12 sm:py-14 ${reveal}`} style={{ animationDelay: "140ms" }}>
          <div className={`${shell} space-y-7`}>
            <div className="mx-auto max-w-2xl space-y-2 text-center">
              <p className={`${label} text-amber-400/90`}>WHY OWNERS USE IT</p>
              <h2 className="text-balance text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl">
                Stop operating without a system. Start running your business with one.
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3 md:gap-5">
              {roiOutcomes.map((r) => {
                const I = r.icon;
                return (
                  <div key={r.label} className={`relative overflow-hidden p-5 ${card}`}>
                    <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-blue-500/10 blur-2xl" />
                    <I className="relative h-5 w-5 text-blue-300" />
                    <div className="relative mt-3 font-mono text-3xl font-semibold tabular-nums tracking-tight text-white">
                      {r.stat}
                    </div>
                    <div className="relative mt-1 text-sm font-semibold text-slate-200">{r.label}</div>
                    <p className="relative mt-2 text-sm leading-relaxed text-slate-400">{r.detail}</p>
                  </div>
                );
              })}
            </div>
            <p className="text-center text-xs text-slate-500">
              Based on pilot programs — results depend on data quality and how often you upload.
            </p>
          </div>
        </section>

        {/* 7 — Integrations */}
        <section className={`border-t border-white/10 bg-white/[0.02] py-10 sm:py-12 ${reveal}`} style={{ animationDelay: "160ms" }}>
          <div className={`${shell} space-y-5`}>
            <div className="mx-auto max-w-2xl space-y-2 text-center">
              <p className={`${label} text-blue-400/90`}>Integrations</p>
              <h2 className="text-balance text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl">
                Meet teams where their data already lives
              </h2>
              <p className="text-sm text-slate-400 sm:text-base">
                We meet you where the records already live — spreadsheets, payroll exports, accounting files.{" "}
                <span className="font-medium text-slate-200">Automate ingestion</span> when your team is ready to hard-plumb the
                pipes.
              </p>
            </div>
            <div className="mx-auto flex max-w-3xl flex-wrap justify-center gap-2">
              {integrationChips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-white/[0.12] bg-gradient-to-b from-white/[0.06] to-transparent px-3 py-1.5 text-xs font-semibold text-slate-300 transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-400/35 hover:text-white"
                >
                  {chip}
                </span>
              ))}
            </div>
            <p className="mx-auto max-w-2xl text-center text-xs leading-relaxed text-slate-500">
              Used by businesses, organizations, and teams operating without structured systems.
            </p>
          </div>
        </section>

        {/* 8 — Pricing */}
        <section className={`border-t border-white/10 bg-gradient-to-b from-slate-950 to-slate-900/88 py-12 sm:py-14 ${reveal}`} style={{ animationDelay: "180ms" }}>
          <div className={`${shell} space-y-7`}>
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div className="max-w-xl space-y-2">
                <p className={`${label} text-emerald-400/90`}>Pricing</p>
                <h2 className="text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl">
                  Choose how much of your data and finance operations we handle
                </h2>
                <p className="text-sm text-slate-400 sm:text-base">
                  Three commercial lanes — scoped on a short call so you are not paying for shelf-ware.
                </p>
              </div>
              <Link
                href="/pricing"
                className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-white/18 bg-white/[0.05] px-5 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-white/28 hover:bg-white/[0.09] sm:self-auto"
              >
                Compare tiers in detail
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid gap-4 lg:grid-cols-3 lg:gap-5">
              {pricingPreview.map((t) => (
                <div
                  key={t.name}
                  className={`flex flex-col p-5 transition-all duration-300 motion-safe:hover:-translate-y-0.5 ${
                    "featured" in t && t.featured
                      ? "rounded-2xl border border-blue-400/45 bg-gradient-to-b from-blue-500/20 to-slate-950/95 shadow-[0_20px_56px_-12px_rgba(37,99,235,0.28)]"
                      : card
                  }`}
                >
                  <div className={`${label} text-left text-[10px] text-slate-500`}>{t.tag}</div>
                  <h3 className="mt-1.5 text-lg font-semibold text-white">{t.name}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-400">{t.blurb}</p>
                  <Link href="/pricing" className="mt-3 inline-flex text-sm font-medium text-blue-300 hover:text-white">
                    See tier details →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 8b — Trust center */}
        <section className={`border-t border-white/10 bg-white/[0.02] py-12 sm:py-14 ${reveal}`} style={{ animationDelay: "190ms" }}>
          <div className={`${shell} space-y-8`}>
            <div className="mx-auto max-w-2xl space-y-3 text-center">
              <p className={`${label} text-emerald-400/90`}>Trust center</p>
              <h2 className="text-balance text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl">
                Built so legal, IT, and the board stop blocking the rollout
              </h2>
              <p className="text-sm text-slate-400 sm:text-base">
                Security narrative, privacy summary, SSO path, API placeholders, backups, and audit-ready controls — one
                link for vendor spend.
              </p>
              <div className="flex flex-wrap justify-center gap-2 pt-1">
                <Link
                  href="/trust"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition-all duration-300 hover:-translate-y-0.5"
                >
                  Explore Trust Center
                  <ChevronRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/security"
                  className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/[0.05] px-5 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-white/28"
                >
                  Security
                </Link>
                <Link
                  href="/privacy"
                  className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/[0.05] px-5 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-white/28"
                >
                  Privacy
                </Link>
              </div>
            </div>
            <TrustComplianceBadges />
          </div>
        </section>

        {/* 9 — FAQ */}
        <section className={`py-12 sm:py-14 ${reveal}`} style={{ animationDelay: "200ms" }}>
          <div className={`${shell} space-y-6`}>
            <div className="mx-auto max-w-2xl space-y-2 text-center">
              <p className={`${label} text-slate-500`}>FAQ</p>
              <h2 className="text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl">
                Questions owners ask before signing up
              </h2>
            </div>
            <HomeFaq />
          </div>
        </section>

        {/* 10 — Final CTA */}
        <section className={`border-t border-white/10 bg-gradient-to-r from-blue-500/12 via-slate-950 to-emerald-400/10 py-12 sm:py-14 ${reveal}`} style={{ animationDelay: "220ms" }}>
          <div className={`${shell} flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center`}>
            <div className="max-w-xl space-y-2">
              <h2 className="text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl">
                Stop guessing which part of your business is bleeding money.
              </h2>
              <p className="text-sm leading-relaxed text-slate-400 sm:text-base">
                Upload your records in under 5 minutes. We&apos;ll structure them into a system you can run on — no credit card
                required.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row sm:gap-3">
              <Link
                href="/book-demo"
                className="inline-flex h-11 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-slate-950 shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
              >
                Start free →
              </Link>
              <Link
                href="/platform"
                className="inline-flex h-11 items-center justify-center rounded-full border border-white/22 bg-white/[0.06] px-6 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-white/32 hover:bg-white/[0.1]"
              >
                Book a demo
              </Link>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
