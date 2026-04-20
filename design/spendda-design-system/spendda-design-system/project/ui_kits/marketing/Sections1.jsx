/* global React */

function TrustedBy() {
  const logos = ["Finance orgs", "Multi-site", "Public sector", "Education", "NGOs", "Growth cos"];
  return (
    <section className={`border-y border-white/10 bg-white/[0.02] py-10 sm:py-12 ${window.reveal}`} style={{ animationDelay: "60ms" }}>
      <div className={`${window.shell} space-y-5`}>
        <p className={`${window.label} text-center text-slate-500`}>Trusted by teams who cannot afford surprises</p>
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          {logos.map((name) => (
            <div key={name} className="flex h-11 min-w-[6.5rem] items-center justify-center rounded-xl border border-white/10 bg-slate-900/50 px-4 text-[11px] font-semibold tracking-wide text-slate-500 transition-colors duration-300 hover:border-white/18 hover:text-slate-300">
              {name}
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-slate-500">
          Logos shown as categories during pilot — reference customers available under NDA.
        </p>
      </div>
    </section>
  );
}

function Solutions() {
  const rows = [
    { title: "SMEs", body: "Payroll, supplier spend, cash visibility, and growth reporting without hiring another analyst bench.", icon: "factory" },
    { title: "Schools & districts", body: "Campus-level budgets, vendor contracts, and payroll variance with rollups leadership can trust.", icon: "graduation-cap" },
    { title: "NGOs & foundations", body: "Grant-aligned reporting and donor-grade transparency without losing operational speed.", icon: "heart-handshake" },
    { title: "Finance & GRC teams", body: "Investigations, exports, and AI Q&A scoped to the rows you authorize — not the whole internet.", icon: "briefcase" },
    { title: "Public sector", body: "Accountability, audit trails, and briefings that survive scrutiny from oversight bodies.", icon: "landmark" },
    { title: "Multi-site operators", body: "Entity workspaces, consolidated views, and drill-down that matches how you actually run.", icon: "building-2" },
  ];
  return (
    <section id="solutions" className={`py-12 sm:py-14 ${window.reveal}`} style={{ animationDelay: "80ms" }}>
      <div className={`${window.shell} space-y-7`}>
        <div className="mx-auto max-w-2xl space-y-2 text-center">
          <p className={`${window.label} text-violet-400/90`}>Industry solutions</p>
          <h2 className="text-balance text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl">
            Same platform. Different accountability profiles.
          </h2>
          <p className="text-sm leading-relaxed text-slate-400 sm:text-base">
            Pick the lane that matches your organization — Spendda adapts entities, language, and reporting pressure
            without forking the product.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {rows.map((row) => (
            <a key={row.title} href="#solutions" className={`group flex flex-col p-5 ${window.cardLink}`}>
              <div className="flex items-start justify-between gap-2">
                <span className="inline-flex rounded-xl border border-white/[0.1] bg-white/[0.04] p-2.5 text-slate-100 transition-colors group-hover:border-blue-400/30">
                  <window.Icon name={row.icon} className="h-5 w-5" />
                </span>
                <window.Icon name="chevron-right" className="h-4 w-4 text-slate-600 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-blue-300" />
              </div>
              <h3 className="mt-3 text-base font-semibold text-white">{row.title}</h3>
              <p className="mt-1.5 flex-1 text-sm leading-relaxed text-slate-400">{row.body}</p>
              <span className="mt-3 text-xs font-semibold text-blue-300/95 group-hover:text-blue-200">View solution patterns</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { step: "1", title: "Ingest what you already have", body: "Drop in CSV or Excel, or stage QuickBooks / payroll exports. Column mapping and health checks happen up front — no surprise garbage in dashboards.", icon: "upload" },
    { step: "2", title: "Let AI pressure-test the story", body: "Surface anomalies, concentration, payroll pressure, and savings hypotheses with confidence-aware narratives tied to your data.", icon: "sparkles" },
    { step: "3", title: "Ship decisions, not decks", body: "Executive PDFs, XLSX packs, alerts, and action queues your CFO can defend in the next leadership meeting.", icon: "file-bar-chart" },
  ];
  return (
    <section className={`border-t border-white/10 bg-white/[0.02] py-12 sm:py-14 ${window.reveal}`} style={{ animationDelay: "100ms" }}>
      <div className={`${window.shell} space-y-7`}>
        <div className="mx-auto max-w-2xl space-y-2 text-center">
          <p className={`${window.label} text-blue-400/90`}>How it works</p>
          <h2 className="text-balance text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl">
            A straight line from messy files to defensible answers
          </h2>
          <p className="text-sm text-slate-400 sm:text-base">
            No rip-and-replace ERP. You prove value on uploads first, then harden with integrations.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3 md:gap-5">
          {steps.map((s) => (
            <div key={s.title} className={`p-5 ${window.card}`}>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.1] bg-slate-900/80 text-sm font-bold tabular-nums text-blue-200">
                {s.step}
              </div>
              <div className="mt-3 inline-flex rounded-lg border border-white/[0.1] bg-blue-500/10 p-2 text-blue-200">
                <window.Icon name={s.icon} className="h-5 w-5" />
              </div>
              <h3 className="mt-3 text-base font-semibold leading-snug text-white">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

window.TrustedBy = TrustedBy;
window.Solutions = Solutions;
window.HowItWorks = HowItWorks;
