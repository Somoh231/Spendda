/* global React */

function HeroProductPreview() {
  // Synthetic dashboard mock — matches the marketing hero preview card.
  const spark = [12, 18, 14, 22, 19, 28, 24, 32, 29, 38, 36, 44, 40, 52];
  const max = Math.max(...spark);
  const w = 360, h = 80, step = w / (spark.length - 1);
  const pts = spark.map((v, i) => `${i * step},${h - (v / max) * (h - 10) - 5}`).join(" ");

  return (
    <div className="relative">
      <div className="pointer-events-none absolute -inset-6 bg-gradient-to-br from-blue-500/30 via-blue-600/10 to-emerald-400/20 blur-2xl" />
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.14] bg-slate-950/70 p-4 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.6)]" />
            Live demo tenant
          </div>
          <div className="text-[10px] text-slate-500">HQ · 30d</div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            { k: "Total spend", v: "$4.82M", d: "+5.2%", pos: true },
            { k: "Payroll", v: "$1.14M", d: "−2.1%", pos: false },
            { k: "Flags", v: "12", d: "+3.4%", pos: true },
          ].map((x) => (
            <div key={x.k} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-2.5">
              <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">{x.k}</div>
              <div className="mt-1 font-mono text-base font-semibold tabular-nums text-white">{x.v}</div>
              <div className={`mt-0.5 text-[10px] font-semibold ${x.pos ? "text-emerald-300" : "text-rose-300"}`}>{x.d}</div>
            </div>
          ))}
        </div>

        <div className="mt-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-200">Spend trend</div>
            <div className="text-[10px] text-slate-500">last 12 weeks</div>
          </div>
          <svg viewBox={`0 0 ${w} ${h}`} className="mt-2 h-20 w-full">
            <defs>
              <linearGradient id="sp-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polyline fill="none" stroke="#60a5fa" strokeWidth="2" points={pts} />
            <polygon fill="url(#sp-area)" points={`0,${h} ${pts} ${w},${h}`} />
          </svg>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-2.5">
            <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">Top flag</div>
            <div className="mt-1 text-[11.5px] font-medium text-white">Duplicate payment · vendor cluster H12</div>
            <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-rose-400/30 bg-rose-400/10 px-2 py-0.5 text-[9.5px] font-semibold text-rose-200">
              High · $38.4K
            </div>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-2.5">
            <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">Data health</div>
            <div className="mt-1 font-mono text-lg font-semibold text-white">92</div>
            <div className="mt-1 h-1.5 rounded-full bg-white/10">
              <div className="h-1.5 rounded-full bg-gradient-to-r from-blue-400 to-emerald-400" style={{ width: "92%" }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Hero() {
  const heroProof = [
    { icon: "shield", text: "Tenant isolation and exports auditors can trace" },
    { icon: "clock", text: "From file drop-in to exec storyline in one sitting" },
    { icon: "target", text: "Less deck theater — more signal per dollar" },
  ];

  return (
    <section className="relative overflow-hidden">
      <div className={`${window.shell} grid gap-8 pb-12 pt-10 sm:pb-14 sm:pt-11 lg:grid-cols-[1.02fr_0.98fr] lg:items-start lg:gap-10 lg:pb-16 lg:pt-12 ${window.reveal}`}>
        <div className="flex min-w-0 flex-col justify-center space-y-5">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-blue-400/35 bg-blue-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-blue-100 sm:text-xs">
            <window.Icon name="bar-chart-3" className="h-3.5 w-3.5" />
            Spend + payroll intelligence
          </div>
          <div className="space-y-3">
            <h1 className="max-w-[24ch] text-balance text-[2rem] font-semibold leading-[1.06] tracking-[-0.035em] text-white sm:text-4xl lg:text-[2.65rem] lg:leading-[1.04]">
              Know what matters before it becomes a problem.
            </h1>
            <p className="max-w-xl text-pretty text-[0.9375rem] leading-relaxed text-slate-400 sm:text-lg">
              Spendda turns <span className="text-slate-200">spend, payroll, and board-ready narrative</span> into one
              governed surface — fast on uploads, serious about controls, integration-ready when IT says go.
            </p>
          </div>
          <div className="flex flex-col gap-2.5 pt-0.5 sm:flex-row sm:flex-wrap">
            <a href="#cta" className="inline-flex h-11 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-blue-400 px-6 text-sm font-semibold text-white shadow-[0_14px_44px_rgba(37,99,235,0.38)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_18px_52px_rgba(37,99,235,0.48)]">
              Book a live walkthrough
              <window.Icon name="arrow-right" className="ml-2 h-4 w-4" />
            </a>
            <a href="#platform" className="inline-flex h-11 items-center justify-center rounded-full border border-white/20 bg-white/[0.04] px-6 text-sm font-semibold text-white backdrop-blur transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[0.08]">
              Explore the platform
            </a>
          </div>
          <ul className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap sm:gap-x-5 sm:gap-y-2">
            {heroProof.map((row) => (
              <li key={row.text} className="flex items-center gap-2 text-xs text-slate-400 sm:text-sm">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-blue-200">
                  <window.Icon name={row.icon} className="h-3.5 w-3.5" />
                </span>
                {row.text}
              </li>
            ))}
          </ul>
        </div>
        <div className="min-w-0 lg:pt-0.5">
          <HeroProductPreview />
        </div>
      </div>
    </section>
  );
}

window.Hero = Hero;
