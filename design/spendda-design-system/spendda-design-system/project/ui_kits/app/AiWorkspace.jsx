/* global React */

function AiWorkspace() {
  const suggestions = [
    "Where did spend drift most last quarter?",
    "Show me vendors with unusual growth since Jan.",
    "Payroll risks by department",
    "Draft the CFO update for this week.",
  ];
  const [q, setQ] = React.useState("");
  const [history, setHistory] = React.useState([
    { role: "user", text: "Summarize last week's flagged spend for the board." },
    { role: "assistant", text: "**Top drivers:** Acme Logistics accounted for $38.4K of new spend (duplicate payment cluster). Contractor #8821 rose 420% vs. baseline — likely onboarding a new scope. Payroll in R&D over-accrued $24.8K, mostly benefits.\n\nSuggested narrative for the board: focus on Acme + Contractor, frame R&D as timing.",
      cites: ["Flag #2094 · Acme", "Flag #2097 · Contractor 8821", "Payroll · R&D · 2026-W13"] },
  ]);

  function submit() {
    if (!q.trim()) return;
    setHistory((h) => [...h, { role: "user", text: q }]);
    setQ("");
    setTimeout(() => {
      setHistory((h) => [...h, {
        role: "assistant",
        text: "Looking across the 2,104 rows in scope for this tenant — I see **3 concentration risks** worth flagging and one supplier worth celebrating. Full narrative ready for export.",
        cites: ["Spend 2026-Q1 · 1,820 rows", "Payroll 2026-Q1 · 284 rows"],
      }]);
    }, 700);
  }

  return (
    <div className="grid h-[calc(100vh-4rem)] gap-4 p-5 lg:grid-cols-[1fr_320px] lg:p-6">
      <div className="flex min-h-0 flex-col rounded-2xl border border-border/60 bg-card">
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--spendda-blue)]">AI Workspace</div>
            <div className="mt-0.5 text-sm font-semibold">Scoped to HQ · 2026-Q1</div>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Grounded to your rows
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {history.map((m, i) => (
            m.role === "user" ? (
              <div key={i} className="ml-auto max-w-[75%] rounded-2xl rounded-tr-sm bg-[var(--spendda-blue)]/90 px-4 py-2.5 text-sm font-medium text-white shadow-sm">
                {m.text}
              </div>
            ) : (
              <div key={i} className="max-w-[90%] space-y-3">
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--spendda-blue)]/15 text-[var(--spendda-blue)]">
                    <window.Icon name="sparkles" className="h-3.5 w-3.5" />
                  </span>
                  Spendda AI
                </div>
                <div className="rounded-2xl rounded-tl-sm border border-border/60 bg-muted/20 p-4 text-sm leading-relaxed text-foreground" style={{ whiteSpace: "pre-wrap" }}>
                  {m.text.split(/\*\*(.+?)\*\*/g).map((seg, j) => j % 2 ? <strong key={j} className="font-semibold text-foreground">{seg}</strong> : <span key={j}>{seg}</span>)}
                </div>
                {m.cites && (
                  <div className="flex flex-wrap gap-2">
                    {m.cites.map((c) => (
                      <span key={c} className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                        <window.Icon name="file-text" className="h-3 w-3" /> {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          ))}
        </div>

        <div className="border-t border-border/60 px-5 py-3">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <button key={s} onClick={() => setQ(s)} className="rounded-full border border-border/60 bg-card px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50">
                {s}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-background px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-[var(--spendda-blue)]/25">
            <window.Icon name="sparkles" className="h-4 w-4 text-[var(--spendda-blue)]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Ask about spend, payroll, or a specific vendor…"
              className="h-9 w-full bg-transparent text-sm outline-none"
            />
            <button onClick={submit} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[var(--spendda-blue)] px-3 text-xs font-semibold text-white hover:opacity-90">
              Ask <window.Icon name="arrow-up-right" className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="hidden min-h-0 flex-col gap-4 lg:flex">
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Scope</div>
          <div className="mt-2 grid gap-2 text-sm">
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Entity</span><span className="font-medium">HQ</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Period</span><span className="font-medium">2026-Q1</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Rows in scope</span><span className="font-mono font-semibold tabular-nums">2,104</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Data health</span><span className="font-semibold text-emerald-300">92 / 100</span></div>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Recent questions</div>
          <ul className="mt-2 grid gap-1 text-sm">
            {[
              "Where did spend drift most last quarter?",
              "Top 5 vendors by risk concentration",
              "Draft CFO weekly update",
              "Payroll variance vs. forecast",
            ].map((q2) => (
              <li key={q2}>
                <button className="w-full rounded-lg px-2 py-1.5 text-left text-muted-foreground hover:bg-muted/40 hover:text-foreground">{q2}</button>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-auto rounded-2xl border border-border/60 bg-card p-4 text-xs leading-relaxed text-muted-foreground">
          Every answer is bound to rows you uploaded. Exports carry row-level citations auditors can follow.
        </div>
      </div>
    </div>
  );
}

window.AiWorkspace = AiWorkspace;
