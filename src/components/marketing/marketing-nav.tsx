"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";

import { cn } from "@/lib/utils";

const LINKS = [
  { label: "Platform", href: "/platform" },
  { label: "Solutions", href: "/solutions" },
  { label: "Pricing", href: "/pricing" },
  { label: "Trust", href: "/trust" },
  { label: "Resources", href: "/resources" },
] as const;

export function MarketingNav() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const on = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-6 sm:h-[4.25rem] lg:px-8">
        <Link href="/" className="group flex shrink-0 items-center gap-3" onClick={() => setOpen(false)}>
          <span className="relative inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white shadow-[0_12px_40px_rgba(37,99,235,0.22)] ring-1 ring-white/10 transition-transform duration-300 group-hover:scale-[1.02]">
            <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-500/20 to-emerald-400/15 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <Image
              src="/brand/spendda-logo.png"
              alt="Spendda"
              width={40}
              height={40}
              sizes="40px"
              className="relative h-9 w-9 object-contain"
              priority
            />
          </span>
          <span className="hidden flex-col leading-tight sm:flex">
            <span className="text-sm font-semibold tracking-tight text-white">Spendda</span>
            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
              Spend + payroll intelligence
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3.5 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 sm:flex">
          <Link
            href="/login"
            className="rounded-full px-4 py-2 text-sm font-medium text-slate-300 transition-all hover:bg-white/5 hover:text-white"
          >
            Login
          </Link>
          <Link
            href="/book-demo"
            className="group relative inline-flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-r from-blue-500 to-blue-400 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_14px_44px_rgba(37,99,235,0.35)] transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(37,99,235,0.45)]"
          >
            <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/0 via-white/15 to-white/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            <span className="relative">Book demo</span>
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white md:hidden"
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <div
        className={cn(
          "border-t border-white/10 bg-slate-950/95 px-6 py-4 md:hidden",
          open ? "block" : "hidden",
        )}
      >
        <nav className="flex flex-col gap-1">
          {LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl px-3 py-3 text-sm font-medium text-slate-200 hover:bg-white/5"
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <Link href="/login" className="rounded-xl px-3 py-3 text-sm font-medium text-slate-200 hover:bg-white/5" onClick={() => setOpen(false)}>
            Login
          </Link>
          <Link
            href="/book-demo"
            className="mt-1 rounded-xl bg-blue-500/15 px-3 py-3 text-center text-sm font-semibold text-blue-100"
            onClick={() => setOpen(false)}
          >
            Book demo
          </Link>
        </nav>
      </div>
    </header>
  );
}
