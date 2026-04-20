"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

const faqs = [
  {
    q: "What does Spendda do, in one sentence?",
    a: "Spendda turns your spend and payroll files into governed dashboards, AI-assisted analysis, and board-ready reports — so finance can answer “what changed?” and “what do we do?” without another ERP project.",
  },
  {
    q: "Can we start without live accounting integrations?",
    a: "Yes. Most teams begin with CSV or Excel uploads and a tenant workspace. Connectors for QuickBooks, Xero, payroll, and banking are architected for when you are ready to automate.",
  },
  {
    q: "Who is Spendda built for?",
    a: "Finance leaders, controllers, and audit-minded teams in SMEs, schools, NGOs, public-sector programs, and multi-site operators who need defensible numbers fast.",
  },
  {
    q: "How is our data handled?",
    a: "Pilot flows are designed around scoped workspaces, role-aware navigation, and clear export trails. Enterprise tiers include stronger isolation, review packs, and integration roadmaps aligned to your procurement process.",
  },
  {
    q: "What outcomes should we expect in the first 30 days?",
    a: "A single source of truth for spend and payroll health, prioritized anomalies and savings signals, and executive narratives your leadership team can actually use — not another static spreadsheet archive.",
  },
  {
    q: "How does pricing work?",
    a: "Starter, Growth, and Enterprise tiers scale with entities, modules, and support. Every serious buyer gets a short scoping call so packaging matches how you operate — see the pricing page for tier framing.",
  },
] as const;

export function HomeFaq() {
  const [open, setOpen] = React.useState<number | null>(0);

  return (
    <div className="mx-auto max-w-2xl divide-y divide-white/10 rounded-2xl border border-white/[0.12] bg-white/[0.02] px-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      {faqs.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q} className="px-3 py-0.5">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-start justify-between gap-3 py-4 text-left transition-colors hover:text-white"
              aria-expanded={isOpen}
            >
              <span className="text-sm font-semibold leading-snug text-slate-100 sm:text-[0.9375rem]">{item.q}</span>
              <ChevronDown
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0 text-slate-500 transition-transform duration-300 ease-out",
                  isOpen && "rotate-180 text-blue-300",
                )}
              />
            </button>
            <div
              className={cn(
                "overflow-hidden transition-[max-height,opacity] duration-300 ease-out",
                isOpen ? "max-h-[28rem] opacity-100" : "max-h-0 opacity-0",
              )}
            >
              <p className="pb-4 text-sm leading-relaxed text-slate-400">{item.a}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
