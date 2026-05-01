import Image from "next/image";
import Link from "next/link";

const cols = [
  {
    title: "Product",
    links: [
      { label: "Platform", href: "/platform" },
      { label: "Solutions", href: "/solutions" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    title: "Trust",
    links: [
      { label: "Trust center", href: "/trust" },
      { label: "Security", href: "/security" },
      { label: "Privacy", href: "/privacy" },
      { label: "API docs", href: "/docs" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Resources", href: "/resources" },
      { label: "Book demo", href: "/book-demo" },
      { label: "Login", href: "/login" },
      { label: "Sign up", href: "/signup" },
    ],
  },
] as const;

const label = "text-xs font-semibold uppercase tracking-[0.2em] text-slate-500";

export function MarketingFooter() {
  return (
    <footer className="border-t border-white/10 bg-slate-950">
      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.1fr)_auto_auto_auto] lg:items-start lg:gap-10 xl:gap-12">
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/[0.14] bg-white shadow-[0_8px_28px_rgba(37,99,235,0.18)]">
                <Image src="/brand/spendda-logo.png" alt="" width={40} height={40} sizes="40px" className="h-9 w-9 object-contain" />
              </span>
              <div>
                <div className="text-sm font-semibold text-white">Spendda</div>
                <div className="text-xs text-slate-500">Data + finance infrastructure for operators without a back-office team.</div>
              </div>
            </div>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-400">
              Upload your records. We structure, clean, and turn them into a system you can actually run your business on.
            </p>
          </div>
          {cols.map((c) => (
            <div key={c.title} className="min-w-[8.5rem]">
              <div className={label}>{c.title}</div>
              <ul className="mt-3 grid gap-1.5">
                {c.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm text-slate-300 transition-colors duration-200 hover:text-white"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:text-sm">
          <span>© {new Date().getUTCFullYear()} Spendda. All rights reserved.</span>
          <Link href="/trust" className="w-fit text-slate-400 transition-colors hover:text-white">
            Trust center →
          </Link>
        </div>
      </div>
    </footer>
  );
}
