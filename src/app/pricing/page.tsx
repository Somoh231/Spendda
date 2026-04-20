import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { SpenddaVsExcelStrip } from "@/components/app/spendda-vs-excel-strip";

const tiers = [
  {
    name: "Starter",
    tag: "Pilot & single entity",
    price: "Contact",
    description: "Ship a credible pilot in weeks: uploads, dashboards, and scoped AI so sponsors see ROI before the next budget cycle.",
    bullets: ["CSV / Excel uploads with mapping", "Core dashboards & alerts", "AI Workspace (tenant-scoped)", "Email support"],
    cta: "Book demo",
    href: "/book-demo",
    featured: false,
  },
  {
    name: "Growth",
    tag: "Multi-entity oversight",
    price: "Contact",
    description: "Regional rollouts with role-based access, exportable board packs, and investigation workflows across entities.",
    bullets: ["Multi-entity & departments", "Enterprise PDF / XLSX bundles", "Investigation & traceability", "Priority support"],
    cta: "Talk to sales",
    href: "/book-demo",
    featured: true,
  },
  {
    name: "Enterprise",
    tag: "Sovereign-grade programs",
    price: "Contact",
    description: "Security review materials, custom data boundaries, and procurement-aligned rollout for ministries and holding groups.",
    bullets: ["Tenant isolation & audit logs", "Security + trust review package", "Integrations roadmap", "Named CSM"],
    cta: "Book demo",
    href: "/book-demo",
    featured: false,
  },
] as const;

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,rgba(37,99,235,0.18),transparent)]" />
      <MarketingNav />
      <main className="mx-auto max-w-7xl px-4 pb-24 pt-12 sm:px-6 lg:px-8 lg:pt-16">
        <p className="text-sm font-semibold text-emerald-200">Pricing</p>
        <h1 className="mt-3 max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          Pricing that scales with conviction
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-slate-400">
          Every tier ships with encryption in transit, role-aware surfaces, and a clear path to production hosting. Packaging
          reflects entity count, modules, and support — we scope it in one short call so procurement gets numbers, not vibes.
        </p>

        <div className="mt-10">
          <SpenddaVsExcelStrip variant="marketing" />
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={`relative flex flex-col rounded-[1.75rem] border p-7 transition-all duration-300 hover:-translate-y-1 ${
                t.featured
                  ? "border-blue-400/35 bg-gradient-to-b from-blue-500/15 to-slate-950/80 shadow-[0_28px_100px_rgba(37,99,235,0.2)]"
                  : "border-white/10 bg-white/[0.03] hover:border-white/20"
              }`}
            >
              {t.featured ? (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-blue-400/30 bg-blue-500/20 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-100">
                  Most popular
                </div>
              ) : null}
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{t.tag}</div>
              <h2 className="mt-2 text-2xl font-semibold">{t.name}</h2>
              <div className="mt-4 text-3xl font-semibold tabular-nums text-white">{t.price}</div>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">{t.description}</p>
              <ul className="mt-6 flex flex-1 flex-col gap-3 text-sm text-slate-300">
                {t.bullets.map((b) => (
                  <li key={b} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    {b}
                  </li>
                ))}
              </ul>
              <Link
                href={t.href}
                className={`mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-full text-sm font-semibold transition-transform hover:-translate-y-0.5 ${
                  t.featured
                    ? "bg-white text-slate-950 shadow-lg"
                    : "border border-white/15 bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                {t.cta}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>

        <p className="mt-12 text-center text-sm text-slate-500">
          Volume licensing for large ministries and holding groups — see{" "}
          <Link href="/trust" className="text-blue-300 hover:text-white">
            trust
          </Link>{" "}
          and{" "}
          <Link href="/security" className="text-blue-300 hover:text-white">
            security
          </Link>{" "}
          before procurement.
        </p>
      </main>
      <MarketingFooter />
    </div>
  );
}
