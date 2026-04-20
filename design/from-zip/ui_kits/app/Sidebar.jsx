/* global React */

const NAV_GROUPS = [
  { label: "Overview", items: [
    { href: "dashboard", label: "Dashboard", icon: "layout-dashboard" },
    { href: "reports", label: "Reports", icon: "file-down" },
  ]},
  { label: "Data & ingest", items: [
    { href: "uploads", label: "Uploads", icon: "upload" },
    { href: "data-health", label: "Data Health", icon: "activity" },
    { href: "documents", label: "Documents", icon: "file-text" },
  ]},
  { label: "Intelligence", items: [
    { href: "ai-workspace", label: "AI Workspace", icon: "message-square" },
    { href: "alerts", label: "Alerts", icon: "bell" },
    { href: "forecasting", label: "Forecasting", icon: "gauge" },
    { href: "debt", label: "Debt Intelligence", icon: "landmark" },
    { href: "profitability", label: "Profitability", icon: "percent" },
    { href: "cashflow", label: "Cash Flow", icon: "waves" },
    { href: "recommendations", label: "Recommendations", icon: "lightbulb" },
    { href: "market-updates", label: "Market updates", icon: "globe-2" },
  ]},
  { label: "Organization", items: [
    { href: "departments", label: "Departments", icon: "building-2" },
    { href: "benchmarks", label: "Benchmarks", icon: "line-chart" },
  ]},
  { label: "Administration", items: [
    { href: "settings", label: "Settings", icon: "settings" },
  ]},
];

function Sidebar({ route, onRoute }) {
  const [collapsed, setCollapsed] = React.useState(false);
  const widthClass = collapsed ? "w-[76px]" : "w-[292px]";

  const linkClass = (active) => {
    const base = "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200";
    const col = collapsed ? " justify-center px-2" : "";
    const state = active
      ? " bg-white/[0.09] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-[var(--spendda-blue)]/35"
      : " text-slate-300/85 hover:bg-white/5 hover:text-white";
    return base + col + state;
  };

  return (
    <aside className={`relative hidden h-screen shrink-0 flex-col border-r border-white/10 bg-[#0b1324] text-slate-300 shadow-[4px_0_32px_rgba(0,0,0,0.28)] transition-[width] duration-300 ease-out md:flex ${widthClass}`}>
      <div className={`flex min-h-[4.5rem] items-center gap-3 border-b border-white/10 px-3 py-3 ${collapsed ? "justify-center px-2" : ""}`}>
        <div className={`flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white shadow-[0_12px_40px_rgba(59,130,246,0.35)] ring-1 ring-[var(--spendda-blue)]/25 ${collapsed ? "h-11 w-11" : "h-[56px] w-[56px]"}`}>
          <img src={window.SPENDDA_LOGO} alt="Spendda" className={collapsed ? "h-9 w-9 object-contain p-0.5" : "h-[52px] w-[52px] object-contain p-0.5"} />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1 leading-tight">
            <div className="text-sm font-semibold tracking-tight text-white">Spendda</div>
            <div className="text-[10px] font-medium leading-snug text-slate-400/70">Finance & payroll signal</div>
            <div className="mt-1 truncate text-xs text-slate-400/60">Private tenant · HQ</div>
          </div>
        )}
      </div>

      <div className={`flex items-center justify-end px-2 py-2 ${collapsed ? "justify-center" : ""}`}>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white"
          aria-label={collapsed ? "Expand" : "Collapse"}
        >
          <window.Icon name={collapsed ? "chevron-right" : "chevron-left"} className="h-4 w-4" />
        </button>
      </div>

      <div className="h-px w-full bg-white/[0.08]" />

      <nav className="grid flex-1 gap-4 overflow-y-auto p-2 pb-6">
        {NAV_GROUPS.map((g) => (
          <div key={g.label} className="grid gap-1">
            {!collapsed ? (
              <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400/45">{g.label}</div>
            ) : (
              <div className="mx-auto my-1 h-px w-8 rounded-full bg-white/10" />
            )}
            {g.items.map((item) => {
              const active = route === item.href;
              return (
                <button key={item.href} onClick={() => onRoute(item.href)} title={collapsed ? item.label : undefined} className={linkClass(active)}>
                  <window.Icon name={item.icon} className={`h-[18px] w-[18px] shrink-0 opacity-90 ${active ? "text-[#60a5fa]" : ""}`} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {!collapsed && (
        <div className="border-t border-white/10 p-4 text-xs leading-relaxed text-slate-400/60">
          Optimized for: spend oversight, payroll narrative…
        </div>
      )}
    </aside>
  );
}

window.Sidebar = Sidebar;
