import { BadgeCheck, FileKey2, Lock, Server } from "lucide-react";

const BADGES = [
  { icon: Lock, label: "TLS 1.2+", detail: "In transit" },
  { icon: FileKey2, label: "Tenant isolation", detail: "Per-client workspaces" },
  { icon: Server, label: "Backups", detail: "Daily snapshots (Enterprise)" },
  { icon: BadgeCheck, label: "SOC 2", detail: "Type II, roadmap" },
] as const;

export function TrustComplianceBadges() {
  return (
    <ul className="flex flex-wrap justify-center gap-3 sm:gap-4">
      {BADGES.map((b) => {
        const I = b.icon;
        return (
          <li
            key={b.label}
            className="flex min-w-[10.5rem] max-w-[13rem] flex-1 flex-col gap-1 rounded-2xl border border-white/[0.12] bg-white/[0.04] px-4 py-3 text-center sm:min-w-0 sm:flex-none sm:px-5"
          >
            <I className="mx-auto h-5 w-5 text-emerald-300/90" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">{b.label}</span>
            <span className="text-[11px] leading-snug text-slate-500">{b.detail}</span>
          </li>
        );
      })}
    </ul>
  );
}
