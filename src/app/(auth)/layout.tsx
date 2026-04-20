import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark min-h-screen bg-slate-950 text-white">
      <div className="absolute inset-x-0 top-0 -z-10 h-[720px] bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.22),_transparent_40%),radial-gradient(circle_at_80%_20%,_rgba(16,185,129,0.14),_transparent_24%),linear-gradient(180deg,_#020617_0%,_#020617_58%,_#07111f_100%)]" />

      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 sm:px-6 lg:px-8">
        <header className="flex h-18 items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-3 text-sm font-semibold tracking-tight text-white"
          >
            <span className="inline-flex h-12 w-12 items-center justify-center overflow-hidden rounded-[1.1rem] border border-white/10 bg-white shadow-[0_16px_56px_rgba(37,99,235,0.26)] ring-1 ring-white/10">
              <Image
                src="/brand/spendda-logo.png"
                alt="Spendda"
                width={48}
                height={48}
                sizes="48px"
                className="h-12 w-12 object-contain"
                priority
              />
            </span>
            <span className="text-base">Spendda</span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className="rounded-full px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              Back to home
            </Link>
            <Link
              href="/app"
              className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white/10"
            >
              View product
            </Link>
          </div>
        </header>

        <main className="flex flex-1 items-center py-10 lg:py-16">
          <div className="grid w-full items-stretch gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="hidden lg:flex">
              <div className="relative w-full overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] p-10 shadow-[0_30px_120px_rgba(2,6,23,0.55)]">
                <div className="absolute -left-24 -top-24 h-[380px] w-[380px] rounded-full bg-blue-500/20 blur-3xl" />
                <div className="absolute -bottom-28 -right-28 h-[380px] w-[380px] rounded-full bg-emerald-400/15 blur-3xl" />

                <div className="relative">
                  <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-4 py-2 text-xs font-semibold text-blue-100">
                    Pilot-ready · tenant-scoped
                  </div>
                  <h1 className="mt-7 text-balance text-4xl font-semibold tracking-[-0.04em] text-white">
                    Sign in to a workspace that earns the next meeting
                  </h1>
                  <p className="mt-4 max-w-lg text-base leading-8 text-slate-300">
                    Spendda connects the dots between vendor lines, payroll risk, and executive narrative—so finance
                    leads the conversation instead of chasing screenshots.
                  </p>

                  <div className="mt-8 grid gap-4">
                    {[
                      ["Evidence-first flags", "Duplicates, spikes, and payroll anomalies with severity you can defend"],
                      ["Board-grade exports", "PDF and Excel packs aligned to your branding and period"],
                      ["Forward-looking view", "Forecast and concentration signals before month-end surprises"],
                    ].map(([k, v]) => (
                      <div
                        key={k}
                        className="rounded-[1.5rem] border border-white/10 bg-slate-950/60 px-5 py-4"
                      >
                        <div className="text-sm font-semibold text-white">
                          {k}
                        </div>
                        <div className="mt-1 text-sm text-slate-300">{v}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-10 grid grid-cols-3 gap-4">
                    {[
                      ["Open items", "Pilot sample"],
                      ["Identified savings", "Illustrative"],
                      ["Composite risk", "Demo score"],
                    ].map(([k, v]) => (
                      <div
                        key={k}
                        className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] px-5 py-4"
                      >
                        <div className="text-xs text-slate-400">{k}</div>
                        <div className="mt-2 text-lg font-semibold text-white">
                          {v}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <div className="w-full max-w-md">{children}</div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

