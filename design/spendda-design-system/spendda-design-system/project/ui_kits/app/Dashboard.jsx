/* global React */

const DASH_MOCK = {
  kpis: [
    { label: "Total spend", value: "$4.82M", delta: "+5.2%", dir: "up", icon: "wallet", sub: "30-day rolling" },
    { label: "Payroll", value: "$1.14M", delta: "−2.1%", dir: "down", icon: "users", sub: "This period" },
    { label: "Open flags", value: "12", delta: "+3", dir: "up", icon: "alert-triangle", sub: "Across HQ" },
    { label: "Data health", value: "92", delta: "+4", dir: "up", icon: "activity", sub: "Ingest score" },
  ],
  trend: [220, 240, 235, 268, 254, 298, 284, 312, 305, 340, 326, 358, 344, 372, 360, 388, 402, 394, 420, 412, 445],
  depts: [
    { label: "Ops", value: 860 },
    { label: "Tech", value: 720 },
    { label: "G&A", value: 540 },
    { label: "Sales", value: 640 },
    { label: "R&D", value: 420 },
    { label: "Mktg", value: 380 },
  ],
  risk: [
    { label: "Low", value: 64, color: "#10b981" },
    { label: "Medium", value: 28, color: "#f59e0b" },
    { label: "High", value: 12, color: "#ef4444" },
  ],
  flags: [
    { vendor: "Acme Logistics", amount: "$38,420", reason: "Duplicate payment cluster", sev: "High", status: "Open" },
    { vendor: "Contractor #8821", amount: "$12,950", reason: "Invoice spike 420% vs. baseline", sev: "High", status: "Investigating" },
    { vendor: "Northwind Supplies", amount: "$7,210", reason: "New vendor · no PO", sev: "Medium", status: "Open" },
    { vendor: "Payroll · R&D", amount: "$24,880", reason: "Payroll variance vs. forecast", sev: "Medium", status: "Assigned" },
    { vendor: "CloudCo", amount: "$4,210", reason: "Weekend spike outside policy", sev: "Low", status: "Open" },
  ],
};

function KpiTile({ k }) {
  return (
    <div className="group relative flex h-full flex-col gap-3 overflow-hidden rounded-2xl border border-border/65 bg-card p-5 shadow-[0_1px_0_rgba(255,255,255,0.04),0_20px_45px_-22px_rgba(2,6,23,0.4)] transition-transform duration-200 hover:-translate-y-0.5">
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[var(--spendda-blue)]/10 blur-2xl transition-opacity group-hover:opacity-100" />
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{k.label}</div>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-muted/40 text-[var(--spendda-blue)]">
          <window.Icon name={k.icon} className="h-4 w-4" />
        </div>
      </div>
      <div className="font-mono text-[1.95rem] font-semibold tabular-nums tracking-tight text-foreground">{k.value}</div>
      <div className="mt-auto flex items-center justify-between text-xs">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${k.dir === "up" ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"}`}>
          <window.Icon name={k.dir === "up" ? "trending-up" : "trending-down"} className="h-3 w-3" />
          {k.delta}
        </span>
        <span className="text-muted-foreground">{k.sub}</span>
      </div>
    </div>
  );
}

function SectionHeader({ eyebrow, title, sub, action }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{eyebrow}</div>}
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">{title}</h2>
        {sub && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

function Dashboard() {
  return (
    <div className="grid gap-5 p-5 lg:p-6">
      <div className="flex flex-col justify-between gap-3 rounded-2xl border border-border/60 bg-[linear-gradient(135deg,rgba(59,130,246,0.08),rgba(16,185,129,0.05))] p-5 sm:flex-row sm:items-center">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--spendda-blue)]">Finance operations</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Welcome back — here's what moved since Friday.</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Spend held slightly over baseline; payroll dipped with Q3 accrual closeout. 3 new flags opened — none blocking.</p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-4 py-2 text-sm font-medium hover:bg-muted/50">
            <window.Icon name="calendar" className="h-4 w-4" /> Last 30 days
          </button>
          <button className="inline-flex items-center gap-2 rounded-full bg-[var(--spendda-blue)] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90">
            <window.Icon name="file-down" className="h-4 w-4" /> Export briefing
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {DASH_MOCK.kpis.map((k) => <KpiTile key={k.label} k={k} />)}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-card p-5">
          <SectionHeader eyebrow="Trend · 21 days" title="Consolidated spend" sub="HQ entity — all categories, weekdays weighted." action={
            <div className="flex gap-1 rounded-full border border-border/60 bg-muted/40 p-1 text-xs">
              {["7d", "30d", "90d", "YTD"].map((t, i) => (
                <button key={t} className={`rounded-full px-2.5 py-1 ${i === 1 ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}>{t}</button>
              ))}
            </div>
          } />
          <div className="mt-4 rounded-xl border border-border/60 bg-muted/20 p-3">
            <window.AreaSpark data={DASH_MOCK.trend} height={180} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[var(--spendda-blue)]" /> Actual</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[var(--spendda-green)]" /> Forecast</span>
            <span className="ml-auto font-medium text-foreground">Peak · Thu +18% vs. median</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <SectionHeader eyebrow="Risk mix" title="Flag severity" />
          <div className="mt-4 flex items-center gap-5">
            <window.Donut parts={DASH_MOCK.risk} size={160} />
            <div className="grid flex-1 gap-2.5">
              {DASH_MOCK.risk.map((r) => (
                <div key={r.label} className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2">
                  <span className="inline-flex items-center gap-2 text-sm">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color }} /> {r.label}
                  </span>
                  <span className="font-mono text-sm font-semibold tabular-nums">{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1 rounded-2xl border border-border/60 bg-card p-5">
          <SectionHeader eyebrow="Departments" title="Spend by department" />
          <div className="mt-4"><window.Bars data={DASH_MOCK.depts} height={180} /></div>
        </div>
        <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-card p-5">
          <SectionHeader eyebrow="Flagged activity" title="Recent flags" sub="Severity-ranked, newest first." action={
            <button className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted/50">
              View all <window.Icon name="arrow-right" className="h-3 w-3" />
            </button>
          } />
          <div className="mt-4 overflow-hidden rounded-xl border border-border/60">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5 font-medium">Entity</th>
                  <th className="px-3 py-2.5 font-medium">Reason</th>
                  <th className="px-3 py-2.5 font-medium">Amount</th>
                  <th className="px-3 py-2.5 font-medium">Sev.</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {DASH_MOCK.flags.map((f, i) => {
                  const sevColor = f.sev === "High" ? "bg-rose-500/15 text-rose-200 border-rose-400/30"
                    : f.sev === "Medium" ? "bg-amber-500/15 text-amber-200 border-amber-400/30"
                    : "bg-emerald-500/15 text-emerald-200 border-emerald-400/30";
                  return (
                    <tr key={i} className="border-t border-border/60 hover:bg-muted/20">
                      <td className="px-3 py-2.5 font-medium">{f.vendor}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{f.reason}</td>
                      <td className="px-3 py-2.5 font-mono tabular-nums">{f.amount}</td>
                      <td className="px-3 py-2.5"><span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${sevColor}`}>{f.sev}</span></td>
                      <td className="px-3 py-2.5 text-muted-foreground">{f.status}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

window.Dashboard = Dashboard;
