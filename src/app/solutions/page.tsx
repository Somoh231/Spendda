import Link from "next/link";
import { ArrowRight, Building2, GraduationCap, HeartHandshake, Landmark, Users } from "lucide-react";

import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingNav } from "@/components/marketing/marketing-nav";

const segments = [
  {
    icon: Users,
    title: "Home care & childcare",
    body: "Caregiver pay ratios, client billing gaps, subsidy payment delays, and cash runway, in one clear view.",
  },
  {
    icon: GraduationCap,
    title: "Schools & districts",
    body: "Campus-level budgets, vendor contracts, and payroll variance with rollups leadership can trust.",
  },
  {
    icon: HeartHandshake,
    title: "NGOs & foundations",
    body: "Grant-aligned reporting and donor-grade transparency without losing operational speed.",
  },
  {
    icon: Building2,
    title: "Finance & GRC teams",
    body: "Oversight layer on your ledgers with repeatable reporting and audit-friendly exports. Built from your real files, not placeholders.",
  },
  {
    icon: Landmark,
    title: "Public sector",
    body: "Accountability, export trails, and briefings that survive scrutiny from oversight bodies.",
  },
  {
    icon: Building2,
    title: "Multi-site operators",
    body: "Compare revenue, labor cost, and vendor spend across all your locations. See which one is underperforming and why.",
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
          Built for the businesses that run on spreadsheets.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-400">
          Spendda turns spreadsheets and manual records into a structured system you can run your business on. We adapt to how you already operate and make your data usable.
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
