import Link from "next/link";
import { ArrowRight, BarChart3, Brain, FileSpreadsheet, LayoutDashboard, Shield } from "lucide-react";

import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { SpenddaVsExcelStrip } from "@/components/app/spendda-vs-excel-strip";

const blocks = [
  {
    icon: FileSpreadsheet,
    title: "Upload-first, venture-fast",
    body: "Drop CSV or Excel, map columns once, and get health scores and KPIs the same day — no six-month integration gate to prove the thesis.",
  },
  {
    icon: Brain,
    title: "AI Workspace with receipts",
    body: "Natural-language answers that point back to rows and exports: board PDFs, XLSX packs, and a trail of what was asked and when.",
  },
  {
    icon: BarChart3,
    title: "Spend, payroll, and forward view",
    body: "Duplicates, concentration, payroll anomalies, and forecasting in one surface so CFOs and ministers see one story, not three spreadsheets.",
  },
  {
    icon: Shield,
    title: "Accountability by design",
    body: "Tenant isolation, role-aware navigation, and investigation flows built for finance, audit, and procurement — not a consumer chat toy.",
  },
];

export default function PlatformPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(37,99,235,0.22),transparent),radial-gradient(ellipse_50%_40%_at_100%_0%,rgba(16,185,129,0.1),transparent)]" />
      <MarketingNav />
      <main className="mx-auto max-w-7xl px-4 pb-24 pt-12 sm:px-6 lg:px-8 lg:pt-16">
        <p className="text-sm font-semibold text-blue-300">Platform</p>
        <h1 className="mt-3 max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          The intelligence layer serious finance teams fund
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-400">
          Govern spend and payroll with uploads, anomaly detection, cash and debt stress tests, and exportable executive
          narratives — layered on top of the systems you already run, not a rip-and-replace science project.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/app"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-400 px-6 py-3 text-sm font-semibold text-white shadow-[0_16px_48px_rgba(37,99,235,0.35)] transition-transform hover:-translate-y-0.5"
          >
            Launch workspace
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/book-demo"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition-all hover:border-white/25 hover:bg-white/10"
          >
            Book demo
          </Link>
        </div>

        <div className="mt-16 grid gap-5 sm:grid-cols-2">
          {blocks.map((b) => {
            const I = b.icon;
            return (
              <div
                key={b.title}
                className="group rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-400/25 hover:bg-white/[0.05]"
              >
                <div className="inline-flex rounded-xl border border-white/10 bg-blue-500/10 p-3 text-blue-200 transition-colors group-hover:border-blue-400/30">
                  <I className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-lg font-semibold text-white">{b.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{b.body}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-16">
          <SpenddaVsExcelStrip variant="marketing" />
        </div>

        <div className="mt-16 flex items-start gap-4 rounded-2xl border border-emerald-400/15 bg-gradient-to-br from-emerald-400/10 to-blue-500/5 p-6 sm:p-8">
          <LayoutDashboard className="mt-0.5 h-6 w-6 shrink-0 text-emerald-300" />
          <div>
            <h2 className="text-lg font-semibold text-white">Dashboard + modules</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              Command center, AI workspace, forecasting, debt and cash intelligence, market and regulatory signals, and
              enterprise report bundles — tenant- and entity-scoped so rollouts stay governable at portfolio scale.
            </p>
            <Link href="/pricing" className="mt-4 inline-flex text-sm font-medium text-blue-300 hover:text-white">
              View pricing →
            </Link>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
