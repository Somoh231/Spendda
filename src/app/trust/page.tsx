import type { Metadata } from "next";
import Link from "next/link";
import {
  Archive,
  ArrowRight,
  BookOpen,
  ClipboardList,
  KeyRound,
  Layers,
  Shield,
  Sparkles,
} from "lucide-react";

import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { TrustComplianceBadges } from "@/components/marketing/trust-badges";

export const metadata: Metadata = {
  title: "Trust center",
  description:
    "Spendda Trust Center — security, privacy, compliance posture, SSO, APIs, backups, and audit readiness for enterprise buyers.",
};

const tiles = [
  {
    href: "/security",
    icon: Shield,
    title: "Security",
    body: "Encryption, tenant isolation, RBAC, and how we approach enterprise hardening.",
  },
  {
    href: "/privacy",
    icon: Layers,
    title: "Privacy",
    body: "What we process, where it lives, subprocessors, and retention controls.",
  },
  {
    href: "/docs",
    icon: BookOpen,
    title: "API documentation",
    body: "Public REST surface — OpenAPI spec and examples ship with your pilot workspace.",
  },
  {
    href: "#sso",
    icon: KeyRound,
    title: "Single sign-on (SSO)",
    body: "SAML 2.0 and OIDC with IdP-initiated login — configured during enterprise onboarding.",
  },
] as const;

export default function TrustCenterPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.16),transparent_55%),radial-gradient(circle_at_100%_40%,rgba(16,185,129,0.12),transparent_40%)]" />
      <MarketingNav />
      <main className="mx-auto max-w-7xl px-4 pb-24 pt-12 sm:px-6 lg:px-8 lg:pt-16">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200">
          <Sparkles className="h-3.5 w-3.5" />
          Trust center
        </div>
        <h1 className="mt-4 max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          Everything procurement asks for — in one place
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-slate-400">
          Spendda is designed for boards, auditors, and IT security teams. Use this hub to review our posture, then
          request a DPA, architecture diagram, or penetration test summary during your pilot.
        </p>

        <div className="mt-12 space-y-4">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Compliance posture</p>
          <TrustComplianceBadges />
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2">
          {tiles.map((t) => {
            const I = t.icon;
            const className =
              "group rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-400/30 hover:bg-white/[0.05]";
            const inner = (
              <>
                <div className="inline-flex rounded-xl border border-white/10 bg-blue-500/10 p-3 text-blue-200 transition-colors group-hover:bg-blue-500/15">
                  <I className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-lg font-semibold text-white">{t.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{t.body}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-blue-300 group-hover:text-white">
                  {t.href.startsWith("#") ? "Jump to section" : "Open"}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </>
            );
            return t.href.startsWith("#") ? (
              <a key={t.title} href={t.href} className={className}>
                {inner}
              </a>
            ) : (
              <Link key={t.href} href={t.href} className={className}>
                {inner}
              </Link>
            );
          })}
        </div>

        <div id="sso" className="mt-14 scroll-mt-24 rounded-2xl border border-white/10 bg-slate-900/50 p-6 sm:p-8">
          <div className="flex flex-wrap items-start gap-3">
            <div className="inline-flex rounded-xl border border-white/10 bg-white/[0.06] p-3 text-white">
              <KeyRound className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-white">SSO — SAML & OIDC</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Enterprise workspaces connect to Okta, Entra ID, Google Workspace, or your preferred IdP. We support SP-
                and IdP-initiated flows, enforced MFA at the IdP, and optional SCIM directory sync on the roadmap. Your
                implementation engineer documents redirect URLs, attribute mapping, and session lifetime during
                onboarding — this site holds a placeholder until your tenant is provisioned.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <ClipboardList className="h-5 w-5 text-emerald-300" />
              <h2 className="text-lg font-semibold text-white">Audit trails & roles</h2>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              Tenant-scoped roles (owner, admin, member, viewer) control uploads, exports, and admin surfaces. Export and
              intelligence events can be mirrored to an audit feed for governance teams — see{" "}
              <Link href="/app/settings/tenant" className="font-medium text-blue-300 hover:text-white">
                Client portal
              </Link>{" "}
              in the product (admin).
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <Archive className="h-5 w-5 text-blue-300" />
              <h2 className="text-lg font-semibold text-white">Backups & availability</h2>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              Production targets include encrypted daily backups, point-in-time recovery for the primary database, and
              documented RTO/RPO per tier. Pilot sandboxes may use shorter retention; your order form states the SLA that
              applies to you.
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/book-demo"
            className="inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition-transform hover:-translate-y-0.5"
          >
            Request enterprise packet
          </Link>
          <Link href="/security" className="inline-flex rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/5">
            Security details
          </Link>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
