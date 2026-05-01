import Link from "next/link";
import { ArrowRight, Database, FileText, ShieldCheck, Sparkles } from "lucide-react";

import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingNav } from "@/components/marketing/marketing-nav";

const cards = [
  {
    title: "Security overview",
    description: "How we think about encryption, RBAC, auditability, and tenant boundaries.",
    href: "/security",
    icon: ShieldCheck,
  },
  {
    title: "Sample spend CSV",
    description: "Representative transactions for demos and column-mapping tests.",
    href: "/samples/spend-sample.csv",
    icon: FileText,
  },
  {
    title: "Sample payroll CSV",
    description: "Payroll rows to exercise anomaly detection and briefing flows.",
    href: "/samples/payroll-sample.csv",
    icon: Database,
  },
  {
    title: "Platform tour",
    description: "What you get after login. Reporting, Q&A, and exports.",
    href: "/platform",
    icon: Sparkles,
  },
] as const;

export default function ResourcesPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(circle_at_70%_0%,rgba(59,130,246,0.18),transparent_50%)]" />
      <MarketingNav />
      <main className="mx-auto max-w-7xl px-4 pb-24 pt-12 sm:px-6 lg:px-8 lg:pt-16">
        <p className="text-sm font-semibold text-blue-300">Resources</p>
        <h1 className="mt-3 max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          See how Spendda works in practice
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-slate-400">
          Explore sample data, reporting outputs, and product walkthroughs to understand how Spendda turns messy records into a working system.
        </p>

        <div className="mt-14 grid gap-5 sm:grid-cols-2">
          {cards.map((c) => {
            const I = c.icon;
            return (
              <Link
                key={c.title}
                href={c.href}
                className="group rounded-2xl border border-white/10 bg-white/[0.03] p-7 transition-all duration-300 hover:-translate-y-1 hover:border-blue-400/30 hover:bg-white/[0.05]"
              >
                <div className="inline-flex rounded-xl border border-white/10 bg-blue-500/10 p-3 text-blue-200 transition-colors group-hover:border-blue-400/30">
                  <I className="h-5 w-5" />
                </div>
                <h2 className="mt-5 text-lg font-semibold">{c.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{c.description}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-blue-300 group-hover:text-white">
                  Open <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            );
          })}
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
