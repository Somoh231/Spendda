import Link from "next/link";
import { ArrowRight, Building2, GraduationCap, HeartHandshake, Landmark, Users } from "lucide-react";

import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingNav } from "@/components/marketing/marketing-nav";

const segments = [
  {
    icon: GraduationCap,
    title: "Schools & districts",
    body: "Multi-campus visibility, grant-aligned spend, and payroll anomaly detection with evidence owners.",
  },
  {
    icon: Users,
    title: "Daycares & care networks",
    body: "Staffing ratios, payroll consistency, and vendor spend tied to compliance-sensitive categories.",
  },
  {
    icon: HeartHandshake,
    title: "NGOs & foundations",
    body: "Donor reporting, field-office burn, and duplicate-payment controls across programs.",
  },
  {
    icon: Building2,
    title: "Finance teams & shared services",
    body: "Month-end acceleration: flags, investigations, and executive briefs grounded in your ledgers.",
  },
  {
    icon: Landmark,
    title: "Public sector",
    body: "Transparency-ready narratives, concentration risk, and procurement oversight for ministries and regions.",
  },
] as const;

export default function SolutionsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[480px] bg-[radial-gradient(circle_at_20%_0%,rgba(59,130,246,0.2),transparent_45%),radial-gradient(circle_at_90%_10%,rgba(16,185,129,0.12),transparent_40%)]" />
      <MarketingNav />
      <main className="mx-auto max-w-7xl px-4 pb-24 pt-12 sm:px-6 lg:px-8 lg:pt-16">
        <p className="text-sm font-semibold text-blue-300">Solutions</p>
        <h1 className="mt-3 max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          Built for teams who cannot afford blind spots
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-400">
          Whether you run a school system, care network, NGO, or public finance shop — Spendda connects spend and payroll
          signals into decisions your board and donors can trust.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/book-demo"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-400 px-6 py-3 text-sm font-semibold text-white shadow-[0_16px_48px_rgba(37,99,235,0.35)] transition-transform hover:-translate-y-0.5"
          >
            Book demo
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/platform"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
          >
            Platform overview
          </Link>
        </div>

        <div className="mt-16 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {segments.map((s) => {
            const I = s.icon;
            return (
              <div
                key={s.title}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:shadow-[0_24px_80px_rgba(2,6,23,0.45)]"
              >
                <I className="h-8 w-8 text-blue-300" />
                <h2 className="mt-4 text-lg font-semibold">{s.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{s.body}</p>
              </div>
            );
          })}
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
