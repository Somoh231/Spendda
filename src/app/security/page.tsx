import type { Metadata } from "next";
import Link from "next/link";
import { Archive, BookLock, Building2, FileSearch, Shield, Users } from "lucide-react";

import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { TrustComplianceBadges } from "@/components/marketing/trust-badges";

export const metadata: Metadata = {
  title: "Security",
  description:
    "Spendda security practices — encryption, tenant isolation, RBAC, audit logging, backups, and enterprise hardening.",
};

const pillars = [
  {
    icon: BookLock,
    title: "Encryption",
    body: "TLS for data in transit. Sensitive configuration and profile payloads use hardened cookie patterns suitable for pilot and production hardening.",
  },
  {
    icon: Users,
    title: "Role-based access",
    body: "Product navigation and surfaces adapt to finance, audit, executive, and analyst personas — reducing accidental exposure in shared tenants.",
  },
  {
    icon: FileSearch,
    title: "Audit logs",
    body: "Intelligence and export flows are designed to leave breadcrumbs suitable for governance reviews (pilot: client-side + server events where enabled).",
  },
  {
    icon: Building2,
    title: "Tenant isolation",
    body: "Workspace data, uploads, and AI context are keyed to tenant sessions so commingled demos never leak across customers.",
  },
] as const;

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[480px] bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.12),transparent_50%),radial-gradient(circle_at_0%_30%,rgba(59,130,246,0.15),transparent_45%)]" />
      <MarketingNav />
      <main className="mx-auto max-w-7xl px-4 pb-24 pt-12 sm:px-6 lg:px-8 lg:pt-16">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200">
          <Shield className="h-3.5 w-3.5" />
          Trust & security
        </div>
        <h1 className="mt-4 max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          Security is not a slide — it&apos;s how the product behaves
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-slate-400">
          Spendda is built for organizations that get audited. Below is how we think about protection in the product
          today; your security team can extend this with SSO, VPC, and DPA as you move to production.
        </p>

        <div className="mt-10 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Trust signals</p>
          <TrustComplianceBadges />
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2">
          {pillars.map((p) => {
            const I = p.icon;
            return (
              <div
                key={p.title}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-400/20"
              >
                <div className="inline-flex rounded-xl border border-white/10 bg-emerald-500/10 p-3 text-emerald-200">
                  <I className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-lg font-semibold text-white">{p.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{p.body}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <Archive className="h-5 w-5 text-emerald-300" />
              <h2 className="text-lg font-semibold text-white">Backups & recovery</h2>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              Enterprise deployments target encrypted backups, tested restore drills, and documented RTO/RPO. Pilot
              tenants may use shorter retention; your contract defines what applies to production data.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-white">Enterprise hardening</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              SOC 2 Type II on the roadmap, SSO (SAML/OIDC), optional VPC peering, and customer-managed keys — mapped
              during onboarding so the pilot workspace can graduate without replatforming.
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-slate-900/50 p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-white">Trust center & policies</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            Privacy summary, API placeholders, SSO narrative, and compliance badges live in the Trust Center — share one
            link with procurement.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/trust"
              className="inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition-transform hover:-translate-y-0.5"
            >
              Open Trust Center
            </Link>
            <Link
              href="/privacy"
              className="inline-flex rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/5"
            >
              Privacy
            </Link>
            <Link
              href="/docs"
              className="inline-flex rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/5"
            >
              API docs
            </Link>
            <Link href="/resources" className="inline-flex rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/5">
              Resources
            </Link>
            <Link
              href="/book-demo"
              className="inline-flex rounded-full border border-emerald-400/30 bg-emerald-500/10 px-5 py-2.5 text-sm font-medium text-emerald-100 hover:bg-emerald-500/15"
            >
              Schedule security review
            </Link>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
