import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Eye, FileQuestion, Globe2, Mail, Shield } from "lucide-react";

import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { TrustComplianceBadges } from "@/components/marketing/trust-badges";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "How Spendda handles personal and organizational data — retention, subprocessors, and your control as a customer.",
};

const sections = [
  {
    icon: Eye,
    title: "What we process",
    body: "Spendda processes files and metadata you upload (for example vendor lines, payroll extracts) to generate analytics, alerts, and reports. We do not sell personal data or use it to train public foundation models without a separate agreement.",
  },
  {
    icon: Globe2,
    title: "Where data lives",
    body: "Pilot deployments may use regional defaults you choose during onboarding. Production deployments target EU or US hosting with tenant-scoped storage and row-level security in the database layer.",
  },
  {
    icon: FileQuestion,
    title: "Subprocessors",
    body: "Infrastructure and authentication providers (for example cloud hosting and identity) are listed in the Trust Center. Customers may request a current subprocessor register and notification process as part of a Data Processing Agreement.",
  },
  {
    icon: Mail,
    title: "Your rights & contacts",
    body: "For access, correction, export, or deletion requests, contact privacy@spendda.com (placeholder). Enterprise customers route requests through their designated admin and your DPA.",
  },
] as const;

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[460px] bg-[radial-gradient(circle_at_70%_0%,rgba(59,130,246,0.14),transparent_50%),radial-gradient(circle_at_20%_40%,rgba(16,185,129,0.1),transparent_45%)]" />
      <MarketingNav />
      <main className="mx-auto max-w-7xl px-4 pb-24 pt-12 sm:px-6 lg:px-8 lg:pt-16">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-200">
          <Shield className="h-3.5 w-3.5" />
          Privacy
        </div>
        <h1 className="mt-4 max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          Privacy that survives procurement review
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-slate-400">
          This page is a buyer-facing summary. Your legal team will receive a full Privacy Policy and Data Processing
          Agreement (DPA) as part of enterprise contracting.
        </p>

        <div className="mt-12">
          <TrustComplianceBadges />
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2">
          {sections.map((s) => {
            const I = s.icon;
            return (
              <div key={s.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <div className="inline-flex rounded-xl border border-white/10 bg-blue-500/10 p-3 text-blue-200">
                  <I className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-lg font-semibold text-white">{s.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{s.body}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-14 rounded-2xl border border-white/10 bg-slate-900/50 p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-white">Data retention</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            Logged-in administrators can set a default retention window for workspace artifacts in{" "}
            <Link href="/app/settings#data-retention" className="font-medium text-blue-300 hover:text-white">
              App settings → Data retention
            </Link>
            . Enterprise plans support legal holds, export-before-delete, and automated purge jobs aligned to your
            policy.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/trust"
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition-transform hover:-translate-y-0.5"
            >
              Trust center
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/security"
              className="inline-flex rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/5"
            >
              Security
            </Link>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
