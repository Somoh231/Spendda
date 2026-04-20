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
  { icon: Shield, text: "Tenant isolation and exports auditors can trace" },
  { icon: Clock, text: "From file drop-in to exec storyline in one sitting" },
  { icon: Target, text: "Less deck theater — more signal per dollar" },
] as const;

const logoPlaceholders = ["Finance orgs", "Multi-site", "Public sector", "Education", "NGOs", "Growth cos"] as const;

const industrySolutions = [
  {
    title: "SMEs",
    body: "Payroll, supplier spend, cash visibility, and growth reporting without hiring another analyst bench.",
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
    body: "Investigations, exports, and AI Q&A scoped to the rows you authorize — not the whole internet.",
    icon: Briefcase,
    href: "/solutions",
  },
  {
    title: "Public sector",
    body: "Accountability, audit trails, and briefings that survive scrutiny from oversight bodies.",
    icon: Landmark,
    href: "/solutions",
  },
  {
    title: "Multi-site operators",
    body: "Entity workspaces, consolidated views, and drill-down that matches how you actually run.",
    icon: Building2,
    href: "/solutions",
  },
] as const;

const howSteps = [
  {
    step: "1",
    title: "Ingest what you already have",
    body: "Drop in CSV or Excel, or stage QuickBooks / payroll exports. Column mapping and health checks happen up front — no surprise garbage in dashboards.",
    icon: Upload,
  },
  {
    step: "2",
    title: "Let AI pressure-test the story",
    body: "Surface anomalies, concentration, payroll pressure, and savings hypotheses with confidence-aware narratives tied to your data.",
    icon: Sparkles,
  },
  {
    step: "3",
    title: "Ship decisions, not decks",
    body: "Executive PDFs, XLSX packs, alerts, and action queues your CFO can defend in the next leadership meeting.",
    icon: FileBarChart,
  },
] as const;

const roiOutcomes = [
  {
    stat: "10×",
    label: "Faster exec narrative",
    detail: "From raw files to a first board-ready storyline — days, not six-week cycles.",
    icon: TrendingUp,
  },
  {
    stat: "−35%",
    label: "Less time in fire drills",
    detail: "Fewer “what happened?” threads when spend, payroll, and risk live in one governed surface.",
    icon: Clock,
  },
  {
    stat: "100%",
    label: "Traceable to source rows",
    detail: "Every chart and AI answer stays scoped to what you uploaded — built for serious buyers.",
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
    blurb: "Single entity, uploads, dashboards, AI Workspace, and core alerts.",
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
                Spend + payroll intelligence
              </div>
              <div className="space-y-3">
                <h1 className="max-w-[24ch] text-balance text-[2rem] font-semibold leading-[1.06] tracking-[-0.035em] text-white sm:text-4xl lg:text-[2.65rem] lg:leading-[1.04]">
                  See risks early. Lead with confidence.
                </h1>
                <p className="max-w-xl text-pretty text-[0.9375rem] leading-relaxed text-slate-400 sm:text-lg">
                  Spendda turns spend, payroll, and reporting into one intelligent workspace. Upload files, uncover risks,
                  monitor performance, and generate decision-ready reports without enterprise complexity.
                </p>
              </div>
              <div className="flex flex-col gap-2.5 pt-0.5 sm:flex-row sm:flex-wrap">
                <Link
                  href="/book-demo"
                  className="inline-flex h-11 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-blue-400 px-6 text-sm font-semibold text-white shadow-[0_14px_44px_rgba(37,99,235,0.38)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_18px_52px_rgba(37,99,235,0.48)]"
                >
                  Book a live walkthrough
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <Link
                  href="/platform"
                  className="inline-flex h-11 items-center justify-center rounded-full border border-white/20 bg-white/[0.04] px-6 text-sm font-semibold text-white backdrop-blur transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[0.08]"
                >
                  Explore the platform
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
            </div>
            <div className="min-w-0 lg:pt-0.5">
              <HeroProductPreview />
            </div>
          </div>
        </section>

        {/* 2 — Trusted by */}
        <section className={`border-y border-white/10 bg-white/[0.02] py-10 sm:py-12 ${reveal}`} style={{ animationDelay: "60ms" }}>
          <div className={`${shell} space-y-5`}>
            <p className={`${label} text-center text-slate-500`}>Trusted by teams who cannot afford surprises</p>
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
              <p className={`${label} text-violet-400/90`}>Industry solutions</p>
              <h2 className="text-balance text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl">
                Same platform. Different accountability profiles.
              </h2>
              <p className="text-sm leading-relaxed text-slate-400 sm:text-base">
                Pick the lane that matches your organization — Spendda adapts entities, language, and reporting pressure
                without forking the product.
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
                A straight line from messy files to defensible answers
              </h2>
              <p className="text-sm text-slate-400 sm:text-base">
                No rip-and-replace ERP. You prove value on uploads first, then harden with integrations.
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

        {/* 5 — Product screenshots */}
        <section className={`py-12 sm:py-14 ${reveal}`} style={{ animationDelay: "120ms" }}>
          <div className={`${shell} space-y-6`}>
            <div className="mx-auto max-w-2xl space-y-2 text-center">
              <p className={`${label} text-emerald-400/90`}>Inside the product</p>
              <h2 className="text-balance text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl">
                Screens buyers actually ask to see
              </h2>
              <p className="text-sm text-slate-400 sm:text-base">
                Command center for health, AI Workspace for interrogation, executive exports for circulation.
              </p>
            </div>
            <ProductScreenshots />
          </div>
        </section>

        {/* 6 — ROI outcomes */}
        <section className={`border-t border-white/10 py-12 sm:py-14 ${reveal}`} style={{ animationDelay: "140ms" }}>
          <div className={`${shell} space-y-7`}>
            <div className="mx-auto max-w-2xl space-y-2 text-center">
              <p className={`${label} text-amber-400/90`}>Outcomes finance measures</p>
              <h2 className="text-balance text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl">
                ROI that shows up in the calendar — not only in a slide deck
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
              Illustrative benchmarks from pilot programs — your mileage depends on data quality and scope.
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
                Start with spreadsheets and exports. <span className="font-medium text-slate-200">Automate ingestion</span>{" "}
                when procurement and IT are ready to sign off.
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
          </div>
        </section>

        {/* 8 — Pricing */}
        <section className={`border-t border-white/10 bg-gradient-to-b from-slate-950 to-slate-900/88 py-12 sm:py-14 ${reveal}`} style={{ animationDelay: "180ms" }}>
          <div className={`${shell} space-y-7`}>
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div className="max-w-xl space-y-2">
                <p className={`${label} text-emerald-400/90`}>Pricing</p>
                <h2 className="text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl">
                  Buy the depth of problem you are solving
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
                link for procurement.
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
                Questions serious buyers ask first
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
                If your next board meeting needs a sharper story, start here.
              </h2>
              <p className="text-sm leading-relaxed text-slate-400 sm:text-base">
                Book a walkthrough and we&apos;ll replay your spend and payroll reality — entities, risks, and reporting
                gaps — in one sitting.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row sm:gap-3">
              <Link
                href="/book-demo"
                className="inline-flex h-11 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-slate-950 shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
              >
                Schedule the walkthrough
              </Link>
              <Link
                href="/platform"
                className="inline-flex h-11 items-center justify-center rounded-full border border-white/22 bg-white/[0.06] px-6 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-white/32 hover:bg-white/[0.1]"
              >
                Read the platform narrative
              </Link>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
