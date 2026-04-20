"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Plug,
  Sparkles,
  TrendingDown,
  Upload,
} from "lucide-react";

function BadgePill({ tone = "blue", children }: { tone?: "blue" | "emerald" | "amber" | "red"; children: React.ReactNode }) {
  const cls =
    tone === "emerald"
      ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-100"
      : tone === "amber"
        ? "border-amber-400/25 bg-amber-400/10 text-amber-100"
        : tone === "red"
          ? "border-rose-400/25 bg-rose-400/10 text-rose-100"
          : "border-blue-400/25 bg-blue-500/12 text-blue-100";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}>
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-40 motion-reduce:animate-none" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      </span>
      {children}
    </span>
  );
}

function SourceChip({ label }: { label: string }) {
  return (
    <span className="rounded-lg border border-white/[0.12] bg-white/[0.04] px-2 py-1 text-[10px] font-medium text-slate-300 transition-colors duration-200 hover:border-white/22 hover:text-slate-100">
      {label}
    </span>
  );
}

function MiniSparkline({ points }: { points: number[] }) {
  const w = 112;
  const h = 32;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const scaleX = (i: number) => (i / (points.length - 1)) * w;
  const scaleY = (v: number) => {
    if (max === min) return h / 2;
    return h - ((v - min) / (max - min)) * h;
  };
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"} ${scaleX(i).toFixed(1)} ${scaleY(p).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-8 w-[7rem] shrink-0" aria-hidden>
      <path d={d} fill="none" stroke="rgba(59,130,246,0.85)" strokeWidth="1.75" strokeLinecap="round" />
      <path d={`${d} L ${w} ${h} L 0 ${h} Z`} fill="url(#heroSparkFill)" />
      <defs>
        <linearGradient id="heroSparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(59,130,246,0.2)" />
          <stop offset="100%" stopColor="rgba(59,130,246,0)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function HeroProductPreview() {
  const bars = [68, 52, 78, 48, 72, 88, 58, 74];
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const id = window.setInterval(() => setTick((t) => (t + 1) % 4), 3200);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="relative motion-safe:animate-fade-in-up">
      <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-blue-500/30 via-blue-600/10 to-emerald-400/20 blur-2xl motion-reduce:blur-none" />
      <div className="absolute -left-5 top-16 hidden max-w-[200px] rounded-2xl border border-white/[0.14] bg-slate-900/95 p-3 shadow-[0_16px_48px_-8px_rgba(0,0,0,0.55)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-400/25 hover:shadow-[0_20px_56px_-8px_rgba(37,99,235,0.18)] xl:block">
        <div className="flex items-center gap-2 text-[10px] font-medium text-slate-400">
          <TrendingDown className="h-3.5 w-3.5 text-emerald-400" />
          Savings opportunity
        </div>
        <div className="mt-1 text-lg font-semibold tabular-nums text-white">$186K</div>
        <p className="mt-1 text-[11px] leading-snug text-slate-400">Vendor overlap + duplicate invoice pattern</p>
      </div>
      <div className="absolute -right-3 bottom-24 hidden rounded-2xl border border-rose-400/30 bg-slate-900/95 p-3 shadow-[0_16px_48px_-8px_rgba(0,0,0,0.55)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-rose-400/45 hover:shadow-[0_20px_56px_-8px_rgba(244,63,94,0.12)] xl:block">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-rose-200">
          <AlertTriangle className="h-3.5 w-3.5" />
          Risk alert
        </div>
        <p className="mt-1 max-w-[190px] text-[11px] leading-relaxed text-slate-300">Payroll spike vs. prior month — Finance review.</p>
      </div>

      <div className="overflow-hidden rounded-[1.75rem] border border-white/[0.14] bg-slate-950/95 shadow-[0_24px_80px_-12px_rgba(0,0,0,0.65)] ring-1 ring-white/[0.06] transition-all duration-300 hover:border-white/[0.18] hover:shadow-[0_28px_90px_-10px_rgba(37,99,235,0.2)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.1] bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white">
              <Image src="/brand/spendda-logo.png" alt="" width={36} height={36} sizes="36px" className="h-8 w-8 object-contain" />
            </span>
            <div className="min-w-0">
              <div className="truncate text-xs font-semibold text-white">Workspace · HQ</div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-slate-500">
                <span className="inline-flex items-center gap-1 text-emerald-400/90">
                  <CheckCircle2 className="h-3 w-3" />
                  Uploads synced
                </span>
                <span className="hidden sm:inline">·</span>
                <span>Last refresh 2m ago</span>
              </div>
            </div>
          </div>
          <BadgePill tone="emerald">Data health strong</BadgePill>
        </div>

        <div className="grid gap-3 p-4 sm:gap-4 sm:p-5">
          <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.12] bg-white/[0.03] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-300 hover:border-white/[0.16] sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-400/28 bg-blue-500/12 text-blue-200">
                <Upload className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Upload status</div>
                <div className="mt-0.5 text-sm font-semibold text-white">2 files ingested · mapping verified</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <SourceChip label="Spend_Q1.xlsx" />
                  <SourceChip label="Payroll.csv" />
                </div>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1 border-t border-white/5 pt-3 sm:border-0 sm:pt-0">
              <span className="text-[10px] text-slate-500">Tenant rows</span>
              <span className="text-lg font-semibold tabular-nums text-white">48.2k</span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 sm:gap-3">
            <div
              className={`rounded-2xl border border-white/[0.12] bg-white/[0.03] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-all duration-300 hover:border-white/[0.16] ${
                tick === 0 ? "ring-1 ring-blue-400/35 shadow-[0_12px_40px_-12px_rgba(37,99,235,0.2)]" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-white">AI insight</span>
                <Sparkles className="h-4 w-4 shrink-0 text-blue-300" />
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                Procurement concentration up 8% — top 3 vendors now represent 41% of non-payroll spend.
              </p>
            </div>
            <div
              className={`rounded-2xl border border-white/[0.12] bg-white/[0.03] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-all duration-300 hover:border-white/[0.16] ${
                tick === 1 ? "ring-1 ring-rose-400/35 shadow-[0_12px_40px_-12px_rgba(244,63,94,0.12)]" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-white">Risk alerts</span>
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" />
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">3 open flags · 1 high severity · owner unassigned</p>
            </div>
            <div
              className={`rounded-2xl border border-white/[0.12] bg-white/[0.03] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-all duration-300 hover:border-white/[0.16] ${
                tick === 2 ? "ring-1 ring-emerald-400/35 shadow-[0_12px_40px_-12px_rgba(16,185,129,0.12)]" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-white">Savings opportunities</span>
                <TrendingDown className="h-4 w-4 shrink-0 text-emerald-300" />
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">Duplicate payment candidates and idle software seats surfaced.</p>
            </div>
            <div
              className={`rounded-2xl border border-white/[0.12] bg-white/[0.03] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-all duration-300 hover:border-white/[0.16] ${
                tick === 3 ? "ring-1 ring-violet-400/35 shadow-[0_12px_40px_-12px_rgba(139,92,246,0.15)]" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-white">Executive brief</span>
                <FileText className="h-4 w-4 shrink-0 text-violet-300" />
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">Board pack draft ready · PDF + narrative appendix</p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.12] bg-white/[0.03] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-all duration-300 hover:border-white/[0.16]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  <Plug className="h-3 w-3 text-slate-400" />
                  Connected sources
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <SourceChip label="Excel" />
                  <SourceChip label="CSV" />
                  <SourceChip label="QuickBooks (export)" />
                  <SourceChip label="API-ready" />
                </div>
              </div>
              <div className="flex items-end gap-2">
                <MiniSparkline points={[12.1, 12.4, 13.0, 13.6, 14.2, 14.8, 15.1]} />
                <BadgePill tone="blue">Forecast +6%</BadgePill>
              </div>
            </div>
            <div className="mt-4 flex h-24 items-end gap-1">
              {bars.map((h, i) => (
                <div
                  key={i}
                  className="flex-1 transition-transform duration-300 hover:-translate-y-0.5 motion-reduce:transform-none"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-blue-700/90 via-blue-500 to-emerald-400/85 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95"
                    style={{ height: `${h}%`, animationDuration: "600ms", animationFillMode: "both" }}
                  />
                </div>
              ))}
            </div>
          </div>

          <Link
            href="/platform"
            className="flex items-center justify-between rounded-2xl border border-blue-400/35 bg-gradient-to-r from-blue-500/16 to-blue-600/6 p-4 text-sm font-semibold text-blue-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-400/50 hover:from-blue-500/24 hover:shadow-[0_16px_48px_-10px_rgba(37,99,235,0.25)]"
          >
            <span>See how the platform fits your stack</span>
            <ArrowRight className="h-4 w-4 shrink-0" />
          </Link>
        </div>
      </div>
    </div>
  );
}
