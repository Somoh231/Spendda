import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Braces, Code2, Webhook } from "lucide-react";

import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingNav } from "@/components/marketing/marketing-nav";

export const metadata: Metadata = {
  title: "API documentation",
  description: "Spendda API reference placeholder — OpenAPI, authentication, and webhooks for enterprise integrations.",
};

export default function ApiDocsPlaceholderPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(circle_at_30%_0%,rgba(99,102,241,0.15),transparent_50%)]" />
      <MarketingNav />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-12 sm:px-6 lg:px-8 lg:pt-16">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/25 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-200">
          <Code2 className="h-3.5 w-3.5" />
          Developers
        </div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">API documentation</h1>
        <p className="mt-5 text-lg text-slate-400">
          A full <span className="text-slate-200">OpenAPI 3.1</span> specification, Postman collection, and tenant-scoped
          examples ship with your enterprise workspace. This public page is a placeholder for SEO and early technical
          diligence.
        </p>

        <ul className="mt-10 space-y-4 text-sm text-slate-300">
          <li className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <Braces className="mt-0.5 h-5 w-5 shrink-0 text-indigo-300" />
            <div>
              <div className="font-semibold text-white">Authentication</div>
              <p className="mt-1 text-slate-400">
                Bearer tokens tied to service principals; short-lived JWTs with rotation. Same tenant boundaries as the
                web app.
              </p>
            </div>
          </li>
          <li className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <Webhook className="mt-0.5 h-5 w-5 shrink-0 text-indigo-300" />
            <div>
              <div className="font-semibold text-white">Webhooks</div>
              <p className="mt-1 text-slate-400">
                Signed delivery for ingest completion, alert escalations, and export jobs — configurable per environment.
              </p>
            </div>
          </li>
        </ul>

        <div className="mt-10 rounded-2xl border border-dashed border-white/20 bg-slate-900/40 p-6">
          <p className="text-sm text-slate-400">
            <span className="font-medium text-slate-200">Coming soon:</span> hosted reference at{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-indigo-200">developers.spendda.com</code> with
            try-it-now requests against a sandbox tenant.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/trust"
            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition-transform hover:-translate-y-0.5"
          >
            Trust center
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/book-demo" className="inline-flex rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/5">
            Request API access
          </Link>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
