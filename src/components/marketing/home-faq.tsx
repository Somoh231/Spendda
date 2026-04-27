"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

const faqs = [
  {
    q: "What does Spendda do, in one sentence?",
    a: "Spendda takes your spend and payroll files and turns them into clear insights and a monthly report — so you know what changed, what looks off, and what to do about it, without needing an accountant or analyst.",
  },
  {
    q: "Can we start without live accounting integrations?",
    a: "Yes — and most people do. Drop in a CSV or Excel export from QuickBooks, Gusto, Square, or any spreadsheet tool. Direct integrations are available when you are ready to automate.",
  },
  {
    q: "Who is Spendda built for?",
    a: "Business owners and operators who are too busy running their business to build financial reports manually — home care agencies, childcare centers, restaurants, retail shops, and any SME that needs clarity without hiring a finance team.",
  },
  {
    q: "How is our data handled?",
    a: "Pilot flows are designed around scoped workspaces, role-aware navigation, and clear export trails. Enterprise tiers include stronger isolation, review packs, and integration roadmaps aligned to your procurement process.",
  },
  {
    q: "What outcomes should we expect in the first 30 days?",
    a: "Most users get their first report within 10 minutes of uploading. In 30 days you will have a clear view of your top vendors, your payroll trend, anything that looks unusual, and a monthly PDF you can share with your accountant or business partner.",
  },
  {
    q: "How does pricing work?",
    a: "Starter is $99/month for one location. Growth is $249/month for multi-location businesses. Enterprise is custom for large organizations, NGOs, and public sector. Every plan starts with a free demo so you can see your own numbers before committing.",
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
