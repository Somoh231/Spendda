/* global React */

function TopNav({ onRoute, theme, onToggleTheme }) {
  const [entity, setEntity] = React.useState("HQ");
  const [role, setRole] = React.useState("Finance Lead");

  return (
    <div className="relative flex h-16 items-center gap-3 border-b border-border/60 px-4 shadow-[0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm"
      style={{ background: "linear-gradient(to right, rgba(8,18,37,0.40) 0%, var(--background) 50%, rgba(59,130,246,0.05) 100%)" }}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px" style={{ background: "linear-gradient(to right, transparent, rgba(59,130,246,0.3), transparent)" }} />

      <button onClick={() => onRoute("dashboard")} className="flex shrink-0 items-center gap-2 rounded-xl border border-border/60 bg-card/90 px-2 py-1.5 shadow-sm transition-colors hover:border-[var(--spendda-blue)]/30 hover:bg-card">
        <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-black/5">
          <img src={window.SPENDDA_LOGO} alt="" className="h-8 w-8 object-contain" />
        </span>
        <span className="hidden text-sm font-semibold tracking-tight sm:inline" style={{ color: "var(--foreground)" }}>Spendda</span>
      </button>

      <div className="relative hidden w-[420px] max-w-[52vw] items-center md:flex">
        <window.Icon name="search" className="pointer-events-none absolute left-3.5 h-4 w-4 text-muted-foreground" />
        <input placeholder="Search vendors, employees, flags…"
          className="h-10 w-full rounded-xl border border-border/70 bg-card/70 pl-10 pr-3 text-sm shadow-sm outline-none transition-shadow focus:shadow-md focus:ring-2 focus:ring-[var(--spendda-blue)]/25" />
      </div>

      <div className="hidden items-center gap-2 md:flex">
        <select value={entity} onChange={(e) => setEntity(e.target.value)} className="h-10 w-[180px] rounded-xl border border-border/70 bg-card/80 px-3 text-sm shadow-sm">
          {["HQ", "Regional · East", "Regional · West", "Subsidiary A"].map((e) => <option key={e}>{e}</option>)}
        </select>
        <select value={role} onChange={(e) => setRole(e.target.value)} className="h-10 w-[170px] rounded-xl border border-border/70 bg-card/80 px-3 text-sm shadow-sm max-md:hidden">
          {["Admin", "Finance Lead", "Executive", "Auditor", "Analyst"].map((r) => <option key={r}>{r}</option>)}
        </select>
        <span className="hidden items-center gap-1.5 rounded-full border border-[var(--spendda-blue)]/25 bg-gradient-to-br from-[var(--spendda-blue)]/12 to-[var(--spendda-green)]/10 px-2.5 py-1 text-xs font-semibold shadow-sm xl:inline-flex">
          <window.Icon name="shield-check" className="h-3.5 w-3.5 text-[var(--spendda-blue)]" />
          {role}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button onClick={() => onRoute("ai-workspace")} className="hidden items-center gap-2 rounded-xl border border-[var(--brand-primary)]/35 bg-[var(--brand-primary)]/12 px-3 py-2 text-sm font-medium text-[var(--brand-primary)] shadow-[0_12px_40px_rgba(37,99,235,0.15)] hover:bg-[var(--brand-primary)]/18 md:inline-flex">
          <window.Icon name="sparkles" className="h-4 w-4" />
          AI Workspace
        </button>
        <button onClick={onToggleTheme} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-transparent hover:border-[var(--brand-primary)]/25 hover:bg-muted/50">
          <window.Icon name={theme === "dark" ? "sun" : "moon"} className="h-4 w-4" />
        </button>
        <button className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-transparent hover:border-[var(--spendda-blue)]/25 hover:bg-muted/50">
          <window.Icon name="bell" className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[var(--spendda-green)] shadow-[0_0_0_2px_var(--background)]" />
        </button>
        <button className="inline-flex items-center gap-2 rounded-full border border-[var(--brand-secondary)]/30 bg-card/90 px-2 py-1.5 text-left shadow-sm hover:bg-muted/50">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--brand-primary)]/15 text-[11px] font-semibold text-[var(--brand-primary)] ring-1 ring-[var(--brand-primary)]/20">DU</span>
          <span className="hidden text-sm font-medium sm:block">Demo User</span>
        </button>
      </div>
    </div>
  );
}

window.TopNav = TopNav;
