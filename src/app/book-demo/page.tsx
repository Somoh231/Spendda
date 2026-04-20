"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight, Calendar } from "lucide-react";

import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function BookDemoPage() {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [org, setOrg] = React.useState("");
  const [notes, setNotes] = React.useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !name.trim()) {
      toast.error("Add your name and work email");
      return;
    }
    toast.success("Request received", {
      description: "This pilot captures details locally. Use Sign up to create an account, or email your team directly.",
    });
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[500px] bg-[radial-gradient(circle_at_30%_0%,rgba(59,130,246,0.2),transparent_45%)]" />
      <MarketingNav />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-12 sm:px-6 lg:pt-16">
        <p className="text-sm font-semibold text-blue-300">Book demo</p>
        <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          See Spendda on your terms
        </h1>
        <p className="mt-5 text-lg text-slate-400">
          Share a few details and we&apos;ll follow up. Prefer to explore first? Create a pilot workspace in minutes.
        </p>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-start">
          <form onSubmit={onSubmit} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name" className="text-slate-300">
                  Full name
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="border-white/10 bg-slate-950/80 text-white placeholder:text-slate-600"
                  placeholder="Jordan Lee"
                  autoComplete="name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-slate-300">
                  Work email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-white/10 bg-slate-950/80 text-white placeholder:text-slate-600"
                  placeholder="you@organization.org"
                  autoComplete="email"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="org" className="text-slate-300">
                  Organization
                </Label>
                <Input
                  id="org"
                  value={org}
                  onChange={(e) => setOrg(e.target.value)}
                  className="border-white/10 bg-slate-950/80 text-white placeholder:text-slate-600"
                  placeholder="Ministry / district / company"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes" className="text-slate-300">
                  What should we prepare?
                </Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[120px] border-white/10 bg-slate-950/80 text-white placeholder:text-slate-600"
                  placeholder="e.g. multi-entity payroll, procurement duplicates, board reporting…"
                />
              </div>
            </div>
            <Button type="submit" className="mt-6 w-full rounded-full sm:w-auto">
              Submit request
            </Button>
            <p className="mt-4 text-xs text-slate-500">
              No backend CRM in this pilot — submission shows a confirmation toast. Wire your form action or Calendly
              URL when ready.
            </p>
          </form>

          <div className="grid gap-4 rounded-2xl border border-white/10 bg-gradient-to-b from-blue-500/10 to-transparent p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Calendar className="h-4 w-4 text-blue-300" />
              Fast paths
            </div>
            <Link
              href="/signup"
              className="inline-flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium transition-all hover:border-blue-400/30 hover:bg-white/10"
            >
              Create account
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/app"
              className="inline-flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium transition-all hover:border-blue-400/30 hover:bg-white/10"
            >
              Open product demo
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/login" className="text-center text-sm text-slate-400 hover:text-white">
              Already have access? Login →
            </Link>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
