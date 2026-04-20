import { FileSpreadsheet, Link2, ShieldCheck } from "lucide-react";

const rows = [
  {
    icon: FileSpreadsheet,
    title: "Excel alone",
    body: "Manual pivots, version chaos, and “who changed this cell?” when leadership asks for the source of truth.",
  },
  {
    icon: Link2,
    title: "Spendda layer",
    body: "Uploads and demo data stay tied to rows—charts, alerts, and AI answers trace back to evidence you can export.",
  },
  {
    icon: ShieldCheck,
    title: "Why buyers pay",
    body: "Same-week narrative for boards and auditors: PDF/XLSX packs, tenant scope, and a path to production controls.",
  },
] as const;

/** Consistent “why not just Excel?” story for dashboard, uploads, and marketing. */
export function SpenddaVsExcelStrip({ variant = "app" }: { variant?: "app" | "marketing" }) {
  const shell =
    variant === "marketing"
      ? "rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-5 sm:px-6 sm:py-6"
      : "rounded-2xl border border-border/60 bg-gradient-to-br from-[var(--spendda-navy)]/[0.05] via-card/80 to-[var(--spendda-blue)]/[0.06] px-4 py-4 shadow-sm sm:px-5 sm:py-5";

  const titleClass = variant === "marketing" ? "text-white" : "text-foreground";
  const bodyClass = variant === "marketing" ? "text-slate-400" : "text-muted-foreground";
  const iconWrap =
    variant === "marketing"
      ? "border-white/10 bg-blue-500/10 text-blue-200"
      : "border-border/60 bg-muted/40 text-[var(--spendda-blue)]";

  return (
    <aside className={shell} aria-labelledby="spendda-vs-excel-heading">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <h2 id="spendda-vs-excel-heading" className={`text-sm font-semibold tracking-tight ${titleClass}`}>
          Why teams move off “just Excel”
        </h2>
        <p className={`text-xs sm:max-w-md sm:text-right ${bodyClass}`}>
          Same files you already have—without another six-week rebuild every quarter.
        </p>
      </div>
      <ul className="mt-4 grid gap-3 sm:grid-cols-3">
        {rows.map((row) => {
          const I = row.icon;
          return (
            <li
              key={row.title}
              className={`flex gap-3 rounded-xl border p-3 ${
                variant === "marketing" ? "border-white/10 bg-slate-950/40" : "border-border/50 bg-background/60"
              }`}
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${iconWrap}`}>
                <I className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <div className={`text-xs font-semibold ${titleClass}`}>{row.title}</div>
                <p className={`mt-1 text-[11px] leading-relaxed sm:text-xs ${bodyClass}`}>{row.body}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
