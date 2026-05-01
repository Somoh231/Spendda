"use client";

import * as React from "react";
import { LayoutDashboard, MessageSquare, FileBarChart } from "lucide-react";

import { cn } from "@/lib/utils";

const tabs = [
  {
    id: "dashboard",
    label: "Command center",
    icon: LayoutDashboard,
    caption: "Live spend, payroll health, and risk in one view.",
  },
  {
    id: "ai",
    label: "AI Workspace",
    icon: MessageSquare,
    caption: "Scoped Q&A and briefings grounded in your rows.",
  },
  {
    id: "reports",
    label: "Executive reports",
    icon: FileBarChart,
    caption: "PDF & XLS packs leadership can circulate immediately.",
  },
] as const;

function MockBars() {
  const h = [44, 62, 38, 72, 52, 68, 48, 76];
  return (
    <div className="flex h-28 items-end gap-1 px-2">
      {h.map((pct, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-sm bg-gradient-to-t from-blue-700/80 to-blue-400/70 motion-safe:animate-in motion-safe:fade-in"
          style={{ height: `${pct}%`, animationDelay: `${i * 40}ms`, animationDuration: "500ms", animationFillMode: "both" }}
        />
      ))}
    </div>
  );
}

function MockAi() {
  return (
    <div className="space-y-2 px-3 py-2">
      <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2 text-[10px] text-slate-400">
        Summarize payroll variance vs. last quarter for HQ.
      </div>
      <div className="rounded-lg border border-blue-400/20 bg-blue-500/10 p-2 text-[10px] text-slate-200">
        Payroll is stable; procurement flags rose 12%. Top vendors are listed with confidence scores.
      </div>
    </div>
  );
}

function MockReport() {
  return (
      <div className="space-y-2 px-3 py-2">
      <div className="h-2 w-[58%] rounded bg-white/10" />
      <div className="h-2 w-[82%] rounded bg-white/[0.08]" />
      <div className="mt-2 grid grid-cols-3 gap-1">
        {[1, 2, 3].map((k) => (
          <div key={k} className="h-12 rounded border border-white/10 bg-white/[0.03]" />
        ))}
      </div>
    </div>
  );
}

export function ProductScreenshots() {
  const [tab, setTab] = React.useState<(typeof tabs)[number]["id"]>("dashboard");
  const active = tabs.find((t) => t.id === tab)!;
  const I = active.icon;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex flex-wrap justify-center gap-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all duration-300 ease-out",
                on
                  ? "border-blue-400/40 bg-blue-500/15 text-white shadow-[0_0_24px_-4px_rgba(59,130,246,0.35)]"
                  : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-slate-200",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div
        key={tab}
        className="overflow-hidden rounded-2xl border border-white/[0.14] bg-slate-950/90 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.55)] ring-1 ring-white/[0.05] motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-500"
      >
        <div className="flex items-center gap-2 border-b border-white/10 bg-slate-900/90 px-3 py-2">
          <div className="flex gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
          </div>
          <div className="mx-auto flex min-w-0 flex-1 items-center justify-center rounded-md border border-white/5 bg-black/30 px-2 py-1 text-[10px] text-slate-500">
            <span className="truncate">app.spendda.io / {tab === "dashboard" ? "dashboard" : tab === "ai" ? "ai-workspace" : "reports"}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2 text-[11px] text-slate-400">
          <I className="h-3.5 w-3.5 text-blue-300" />
          {active.caption}
        </div>
        <div className="min-h-[200px] p-3 sm:min-h-[220px]">
          {tab === "dashboard" ? <MockBars /> : null}
          {tab === "ai" ? <MockAi /> : null}
          {tab === "reports" ? <MockReport /> : null}
        </div>
      </div>
    </div>
  );
}
