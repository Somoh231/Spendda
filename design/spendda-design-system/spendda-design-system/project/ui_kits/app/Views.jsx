/* global React */

function Uploads() {
  const [stage, setStage] = React.useState("idle"); // idle -> parsed
  React.useEffect(() => { const t = setTimeout(() => setStage("parsed"), 1200); return () => clearTimeout(t); }, []);

  const rows = [
    { date: "2026-01-04", vendor: "Acme Logistics", dept: "Ops", amount: 38420, flag: true },
    { date: "2026-01-05", vendor: "CloudCo", dept: "Tech", amount: 2140, flag: false },
    { date: "2026-01-05", vendor: "Northwind Supplies", dept: "Ops", amount: 7210, flag: true },
    { date: "2026-01-06", vendor: "Contractor #8821", dept: "R&D", amount: 12950, flag: true },
    { date: "2026-01-07", vendor: "OfficeMax", dept: "G&A", amount: 640, flag: false },
  ];

  return (
    <div className="grid gap-5 p-5 lg:p-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--spendda-blue)]">Data & ingest</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Uploads</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Drop in CSV or Excel. We'll detect columns, health-check it, and stage it for scoring — no surprises downstream.</p>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--spendda-green)]/30 bg-[var(--spendda-green)]/10 px-3 py-1 text-xs font-semibold text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Audit log live
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <div className="rounded-2xl border border-dashed border-border/70 bg-card p-6 shadow-sm">
          <div className="flex h-56 flex-col items-center justify-center rounded-xl border border-border/60 bg-muted/20 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--spendda-blue)]/15 text-[var(--spendda-blue)]">
              <window.Icon name="upload-cloud" className="h-6 w-6" />
            </div>
            <div className="mt-3 text-base font-semibold">Drop spend or payroll file here</div>
            <div className="mt-1 text-xs text-muted-foreground">CSV or XLSX · up to 50MB · tenant-scoped</div>
            <button className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--spendda-blue)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
              <window.Icon name="file-plus" className="h-4 w-4" /> Choose file
            </button>
          </div>
          <div className="mt-4 grid gap-2 text-xs">
            {[
              { k: "Supported", v: "CSV, XLSX, XLS — QuickBooks exports, Gusto, ADP, custom" },
              { k: "Security", v: "Encrypted at rest. Row-level scoping per workspace." },
              { k: "Mapping", v: "Column detection + confirmation step before scoring." },
            ].map((r) => (
              <div key={r.k} className="flex items-start gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 py-2">
                <window.Icon name="shield-check" className="h-3.5 w-3.5 text-emerald-400 mt-0.5" />
                <div><div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{r.k}</div><div className="text-sm">{r.v}</div></div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Preview</div>
              <div className="mt-0.5 text-sm font-semibold">spend_2026_q1.csv · 1,820 rows</div>
            </div>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${stage === "parsed" ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-amber-400/30 bg-amber-400/10 text-amber-300"}`}>
              {stage === "parsed" ? "Parsed · 92/100 health" : "Parsing…"}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2 text-xs">
            {[
              { k: "Columns detected", v: "12" },
              { k: "Date field", v: "posting_date" },
              { k: "Amount field", v: "amount_usd" },
              { k: "Currency", v: "USD" },
            ].map((m) => (
              <div key={m.k} className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{m.k}</div>
                <div className="mt-0.5 text-sm font-medium">{m.v}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-border/60">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Vendor</th>
                  <th className="px-3 py-2 font-medium">Dept</th>
                  <th className="px-3 py-2 text-right font-medium">Amount</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t border-border/60">
                    <td className="px-3 py-2 font-mono tabular-nums text-muted-foreground">{r.date}</td>
                    <td className="px-3 py-2 font-medium">{r.vendor}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.dept}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">${r.amount.toLocaleString()}</td>
                    <td className="px-3 py-2">
                      {r.flag ? <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/30 bg-rose-400/10 px-2 py-0.5 text-[11px] font-semibold text-rose-200"><window.Icon name="alert-triangle" className="h-3 w-3" /> Flagged</span>
                        : <span className="inline-flex rounded-full border border-border/60 px-2 py-0.5 text-[11px] text-muted-foreground">Clean</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button className="rounded-full border border-border/70 bg-card px-4 py-2 text-sm font-medium hover:bg-muted/50">Remap columns</button>
            <button className="rounded-full bg-[var(--spendda-blue)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90">Confirm & score</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Alerts() {
  const ALERTS = [
    { sev: "High", title: "Duplicate payment cluster · Acme Logistics", vendor: "Acme Logistics", amount: "$38,420", when: "2h ago", body: "5 near-identical invoices in 72h, same vendor cluster. Confidence 0.88." },
    { sev: "High", title: "Payroll variance spike · R&D", vendor: "Payroll · R&D", amount: "$24,880", when: "Today, 09:02", body: "Variance vs. forecast exceeds 3σ for first time in 12 weeks." },
    { sev: "Medium", title: "New vendor without PO · Northwind", vendor: "Northwind Supplies", amount: "$7,210", when: "Yesterday", body: "First-time vendor. Policy requires PO ≥ $5K." },
    { sev: "Medium", title: "Weekend spend spike · CloudCo", vendor: "CloudCo", amount: "$4,210", when: "2d ago", body: "Spike outside business-hours policy window." },
    { sev: "Low", title: "Category drift · Travel", vendor: "Multiple", amount: "—", when: "3d ago", body: "Spend shifting from Airfare to Rail — check category mapping." },
  ];
  const [filter, setFilter] = React.useState("All");
  const rows = filter === "All" ? ALERTS : ALERTS.filter((a) => a.sev === filter);

  return (
    <div className="grid gap-5 p-5 lg:p-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--spendda-blue)]">Intelligence</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Alerts</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Severity-ranked issues scored from your tenant's rows. Assign, resolve, or escalate.</p>
        </div>
        <div className="flex gap-1 rounded-full border border-border/60 bg-card p-1 text-xs">
          {["All", "High", "Medium", "Low"].map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={`rounded-full px-3 py-1 font-medium ${filter === s ? "bg-[var(--spendda-blue)] text-white" : "text-muted-foreground hover:text-foreground"}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3">
        {rows.map((a, i) => {
          const sevColor = a.sev === "High" ? "border-rose-400/30 bg-rose-400/10 text-rose-200"
            : a.sev === "Medium" ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
            : "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
          const dotColor = a.sev === "High" ? "bg-rose-400" : a.sev === "Medium" ? "bg-amber-400" : "bg-emerald-400";
          return (
            <div key={i} className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-start gap-3">
                <span className={`mt-1 inline-flex h-2.5 w-2.5 shrink-0 rounded-full ${dotColor}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">{a.title}</h3>
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${sevColor}`}>{a.sev}</span>
                    <span className="text-xs text-muted-foreground">{a.when}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-muted-foreground">{a.body}</p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-lg border border-border/60 bg-muted/30 px-2 py-1">{a.vendor}</span>
                    <span className="rounded-lg border border-border/60 bg-muted/30 px-2 py-1 font-mono tabular-nums">{a.amount}</span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-1.5">
                  <button className="rounded-full border border-border/70 bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted/50">Assign</button>
                  <button className="rounded-full bg-[var(--spendda-blue)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">Escalate</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

window.Uploads = Uploads;
window.Alerts = Alerts;
