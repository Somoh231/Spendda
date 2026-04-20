/* global React */

function LoginDrawer({ open, onClose }) {
  const [submitting, setSubmitting] = React.useState(false);
  const [msg, setMsg] = React.useState(null);

  function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setMsg("Demo login — would redirect to /app.");
    }, 700);
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-end bg-slate-950/60 p-0 backdrop-blur-sm sm:p-6" onClick={onClose}>
      <div className="relative flex h-full w-full max-w-md flex-col overflow-hidden rounded-none border border-white/10 bg-slate-950/95 text-white shadow-[0_30px_120px_rgba(2,6,23,0.55)] backdrop-blur sm:h-auto sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <div>
            <div className="text-lg font-semibold tracking-[-0.02em]">Welcome back</div>
            <div className="mt-1 text-xs text-slate-400">Sign in or open the governed demo.</div>
          </div>
          <button className="rounded-full p-2 text-slate-400 hover:bg-white/5 hover:text-white" onClick={onClose}>
            <window.Icon name="x" className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">
          <form onSubmit={submit} className="grid gap-4">
            <div className="grid gap-2">
              <label className="text-xs font-medium text-slate-300">Email</label>
              <input type="email" placeholder="name@org.gov" className="h-10 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-400/45 focus:ring-2 focus:ring-blue-400/25" />
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-medium text-slate-300">Password</label>
              <input type="password" placeholder="••••••••" className="h-10 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-400/45 focus:ring-2 focus:ring-blue-400/25" />
            </div>
            <button type="submit" disabled={submitting} className="mt-1 inline-flex h-11 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-blue-400 px-4 text-sm font-semibold text-white shadow-[0_14px_44px_rgba(37,99,235,0.35)] transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-70">
              {submitting ? "Signing in…" : "Continue"}
            </button>
          </form>
          <div className="my-5 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            <div className="h-px flex-1 bg-white/10" /> or <div className="h-px flex-1 bg-white/10" />
          </div>
          <button
            onClick={() => setMsg("Entering demo tenant with seeded uploads…")}
            className="inline-flex h-11 w-full items-center justify-center rounded-full border border-white/20 bg-white/[0.04] px-4 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[0.08]"
          >
            Enter demo platform
          </button>
          {msg && (
            <div className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-xs text-emerald-100">
              <window.Icon name="check-circle-2" className="mr-2 inline h-3.5 w-3.5 align-[-2px]" />
              {msg}
            </div>
          )}
          <div className="mt-4 text-xs text-slate-500">
            New here? <a href="#cta" className="text-blue-300 hover:text-blue-200">Book a walkthrough →</a>
          </div>
        </div>
      </div>
    </div>
  );
}

window.LoginDrawer = LoginDrawer;
