/* global React */

function ROI() {
  const rows = [
    { stat: "10×", label: "Faster exec narrative", detail: "From raw files to a first board-ready storyline — days, not six-week cycles.", icon: "trending-up" },
    { stat: "−35%", label: "Less time in fire drills", detail: "Fewer \u201Cwhat happened?\u201D threads when spend, payroll, and risk live in one governed surface.", icon: "clock" },
    { stat: "100%", label: "Traceable to source rows", detail: "Every chart and AI answer stays scoped to what you uploaded — built for serious buyers.", icon: "shield" },
  ];
  return (
    <section className={`border-t border-white/10 py-12 sm:py-14 ${window.reveal}`} style={{ animationDelay: "140ms" }}>
      <div className={`${window.shell} space-y-7`}>
        <div className="mx-auto max-w-2xl space-y-2 text-center">
          <p className={`${window.label} text-amber-400/90`}>Outcomes finance measures</p>
          <h2 className="text-balance text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl">
            ROI that shows up in the calendar — not only in a slide deck
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3 md:gap-5">
          {rows.map((r) => (
            <div key={r.label} className={`relative overflow-hidden p-5 ${window.card}`}>
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-blue-500/10 blur-2xl" />
              <window.Icon name={r.icon} className="relative h-5 w-5 text-blue-300" />
              <div className="relative mt-3 font-mono text-3xl font-semibold tabular-nums tracking-tight text-white">{r.stat}</div>
              <div className="relative mt-1 text-sm font-semibold text-slate-200">{r.label}</div>
              <p className="relative mt-2 text-sm leading-relaxed text-slate-400">{r.detail}</p>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-slate-500">
          Illustrative benchmarks from pilot programs — your mileage depends on data quality and scope.
        </p>
      </div>
    </section>
  );
}

function Integrations() {
  const chips = ["QuickBooks", "Xero", "Gusto", "ADP", "Excel", "CSV", "API-ready"];
  return (
    <section className={`border-t border-white/10 bg-white/[0.02] py-10 sm:py-12 ${window.reveal}`} style={{ animationDelay: "160ms" }}>
      <div className={`${window.shell} space-y-5`}>
        <div className="mx-auto max-w-2xl space-y-2 text-center">
          <p className={`${window.label} text-blue-400/90`}>Integrations</p>
          <h2 className="text-balance text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl">
            Meet teams where their data already lives
          </h2>
          <p className="text-sm text-slate-400 sm:text-base">
            Start with spreadsheets and exports. <span className="font-medium text-slate-200">Automate ingestion</span> when procurement and IT are ready to sign off.
          </p>
        </div>
        <div className="mx-auto flex max-w-3xl flex-wrap justify-center gap-2">
          {chips.map((chip) => (
            <span key={chip} className="rounded-full border border-white/[0.12] bg-gradient-to-b from-white/[0.06] to-transparent px-3 py-1.5 text-xs font-semibold text-slate-300 transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-400/35 hover:text-white">
              {chip}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const tiers = [
    { name: "Starter", tag: "Prove it fast", blurb: "Single entity, uploads, dashboards, AI Workspace, and core alerts." },
    { name: "Growth", tag: "Scale oversight", blurb: "Multi-entity rollouts, reporting packs, investigations, priority support.", featured: true },
    { name: "Enterprise", tag: "Program-grade", blurb: "Isolation, security reviews, integrations roadmap, named CSM." },
  ];
  return (
    <section id="pricing" className={`border-t border-white/10 bg-gradient-to-b from-slate-950 to-slate-900/88 py-12 sm:py-14 ${window.reveal}`} style={{ animationDelay: "180ms" }}>
      <div className={`${window.shell} space-y-7`}>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="max-w-xl space-y-2">
            <p className={`${window.label} text-emerald-400/90`}>Pricing</p>
            <h2 className="text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl">
              Buy the depth of problem you are solving
            </h2>
            <p className="text-sm text-slate-400 sm:text-base">
              Three commercial lanes — scoped on a short call so you are not paying for shelf-ware.
            </p>
          </div>
          <a href="#pricing" className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-white/18 bg-white/[0.05] px-5 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-white/28 hover:bg-white/[0.09] sm:self-auto">
            Compare tiers in detail
            <window.Icon name="arrow-right" className="h-4 w-4" />
          </a>
        </div>
        <div className="grid gap-4 lg:grid-cols-3 lg:gap-5">
          {tiers.map((t) => (
            <div key={t.name} className={`flex flex-col p-5 transition-all duration-300 motion-safe:hover:-translate-y-0.5 ${t.featured ? "rounded-2xl border border-blue-400/45 bg-gradient-to-b from-blue-500/20 to-slate-950/95 shadow-[0_20px_56px_-12px_rgba(37,99,235,0.28)]" : window.card}`}>
              <div className={`${window.label} text-left text-[10px] text-slate-500`}>{t.tag}</div>
              <h3 className="mt-1.5 text-lg font-semibold text-white">{t.name}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-400">{t.blurb}</p>
              <a href="#pricing" className="mt-3 inline-flex text-sm font-medium text-blue-300 hover:text-white">
                See tier details →
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TrustCenter() {
  const badges = ["SOC 2 (Type II) · in flight", "SSO / SAML / SCIM", "Region-locked data", "Encryption at rest & in transit", "Audit logs", "Supabase tenant isolation"];
  return (
    <section id="trust" className={`border-t border-white/10 bg-white/[0.02] py-12 sm:py-14 ${window.reveal}`} style={{ animationDelay: "190ms" }}>
      <div className={`${window.shell} space-y-8`}>
        <div className="mx-auto max-w-2xl space-y-3 text-center">
          <p className={`${window.label} text-emerald-400/90`}>Trust center</p>
          <h2 className="text-balance text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl">
            Built so legal, IT, and the board stop blocking the rollout
          </h2>
          <p className="text-sm text-slate-400 sm:text-base">
            Security narrative, privacy summary, SSO path, API placeholders, backups, and audit-ready controls — one link for procurement.
          </p>
          <div className="flex flex-wrap justify-center gap-2 pt-1">
            <a href="#trust" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition-all duration-300 hover:-translate-y-0.5">
              Explore Trust Center
              <window.Icon name="chevron-right" className="h-4 w-4" />
            </a>
            <a href="#trust" className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/[0.05] px-5 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-white/28">
              Security
            </a>
            <a href="#trust" className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/[0.05] px-5 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-white/28">
              Privacy
            </a>
          </div>
        </div>
        <div className="mx-auto flex max-w-4xl flex-wrap justify-center gap-2">
          {badges.map((b) => (
            <span key={b} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/40 px-3 py-1.5 text-[11.5px] font-medium text-slate-300">
              <window.Icon name="shield-check" className="h-3.5 w-3.5 text-emerald-300" />
              {b}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const items = [
    { q: "What do we need before day one?", a: "Spend and payroll exports (CSV or Excel) from the last 6–12 months, plus a named workspace owner. No ERP connector required to prove value." },
    { q: "Where does the AI get its answers?", a: "Only from the rows you uploaded. Every response cites the source columns and flags gaps — no internet-scale knowledge, no surprise writing." },
    { q: "How fast can procurement sign off?", a: "We ship a trust-center packet with the walkthrough. Most legal/IT teams unblock within two weeks when they have SSO, audit logs, and tenant isolation in one link." },
    { q: "Can we keep using Excel alongside Spendda?", a: "Yes — the product is built to play nice with exports. XLSX/PDF packs drop into the same review cadence finance already runs." },
  ];
  const [open, setOpen] = React.useState(0);
  return (
    <section className={`py-12 sm:py-14 ${window.reveal}`} style={{ animationDelay: "200ms" }}>
      <div className={`${window.shell} space-y-6`}>
        <div className="mx-auto max-w-2xl space-y-2 text-center">
          <p className={`${window.label} text-slate-500`}>FAQ</p>
          <h2 className="text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl">
            Questions serious buyers ask first
          </h2>
        </div>
        <div className="mx-auto max-w-2xl space-y-2">
          {items.map((it, i) => {
            const isOpen = open === i;
            return (
              <button key={i} onClick={() => setOpen(isOpen ? -1 : i)} className="block w-full text-left">
                <div className={`rounded-2xl border ${isOpen ? "border-blue-400/35 bg-white/[0.05]" : "border-white/[0.12] bg-white/[0.025]"} p-4 transition-all duration-300`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="text-sm font-semibold text-white">{it.q}</div>
                    <window.Icon name="chevron-down" className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </div>
                  {isOpen && <p className="mt-2 text-sm leading-relaxed text-slate-400">{it.a}</p>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section id="cta" className={`border-t border-white/10 bg-gradient-to-r from-blue-500/12 via-slate-950 to-emerald-400/10 py-12 sm:py-14 ${window.reveal}`} style={{ animationDelay: "220ms" }}>
      <div className={`${window.shell} flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center`}>
        <div className="max-w-xl space-y-2">
          <h2 className="text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl">
            If your next board meeting needs a sharper story, start here.
          </h2>
          <p className="text-sm leading-relaxed text-slate-400 sm:text-base">
            Book a walkthrough and we'll replay your spend and payroll reality — entities, risks, and reporting gaps — in one sitting.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row sm:gap-3">
          <a href="#cta" className="inline-flex h-11 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-slate-950 shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
            Schedule the walkthrough
          </a>
          <a href="#platform" className="inline-flex h-11 items-center justify-center rounded-full border border-white/22 bg-white/[0.06] px-6 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-white/32 hover:bg-white/[0.1]">
            Read the platform narrative
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const cols = [
    { title: "Product", links: ["Platform", "Solutions", "Pricing"] },
    { title: "Trust", links: ["Trust center", "Security", "Privacy", "API docs"] },
    { title: "Company", links: ["Resources", "Book demo", "Login", "Sign up"] },
  ];
  return (
    <footer className="border-t border-white/10 bg-slate-950">
      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.1fr)_auto_auto_auto] lg:items-start lg:gap-10 xl:gap-12">
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/[0.14] bg-white shadow-[0_8px_28px_rgba(37,99,235,0.18)]">
                <img src={window.SPENDDA_LOGO} alt="" className="h-9 w-9 object-contain" />
              </span>
              <div>
                <div className="text-sm font-semibold text-white">Spendda</div>
                <div className="text-xs text-slate-500">Operational finance, venture-ready</div>
              </div>
            </div>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-400">
              Turn uploads into decisions: anomalies, forecasts, and board-ready exports—without rebuilding everything in Excel every quarter.
            </p>
          </div>
          {cols.map((c) => (
            <div key={c.title} className="min-w-[8.5rem]">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{c.title}</div>
              <ul className="mt-3 grid gap-1.5">
                {c.links.map((l) => (
                  <li key={l}>
                    <a href="#footer" className="text-sm text-slate-300 transition-colors duration-200 hover:text-white">{l}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:text-sm">
          <span>© 2026 Spendda. All rights reserved.</span>
          <a href="#trust" className="w-fit text-slate-400 transition-colors hover:text-white">Trust center →</a>
        </div>
      </div>
    </footer>
  );
}

window.ROI = ROI;
window.Integrations = Integrations;
window.Pricing = Pricing;
window.TrustCenter = TrustCenter;
window.FAQ = FAQ;
window.FinalCta = FinalCta;
window.Footer = Footer;
