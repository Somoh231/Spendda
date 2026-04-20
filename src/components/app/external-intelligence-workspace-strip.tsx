"use client";

import * as React from "react";
import Link from "next/link";
import { Megaphone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { getHighPriorityExternalUpdates } from "@/lib/external-intelligence";
import { useProfile } from "@/lib/profile/client";

export function ExternalIntelligenceWorkspaceStrip() {
  const { profile } = useProfile();
  const high = React.useMemo(() => getHighPriorityExternalUpdates(profile ?? null, 5), [profile]);
  if (!high.length) return null;

  return (
    <div className="shrink-0 border-b border-amber-500/15 bg-gradient-to-r from-amber-500/[0.07] to-transparent px-4 py-2.5 sm:px-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2 text-xs">
          <Megaphone className="h-3.5 w-3.5 shrink-0 text-amber-500/90" aria-hidden />
          <span className="font-semibold text-foreground">External intelligence</span>
          <span className="hidden text-muted-foreground sm:inline">High-priority regulatory / market items for your profile:</span>
        </div>
        <Link href="/app/market-updates" className="shrink-0 text-[11px] font-medium text-[var(--spendda-blue)] hover:underline">
          Open feed →
        </Link>
      </div>
      <ul className="mt-2 flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:gap-2">
        {high.map((u) => (
          <li key={u.id} className="flex min-w-0 items-start gap-2 sm:max-w-[min(100%,280px)]">
            <Badge variant={u.urgency === "Critical" ? "destructive" : "secondary"} className="mt-0.5 shrink-0 text-[9px]">
              {u.urgency}
            </Badge>
            <span className="text-[11px] leading-snug text-muted-foreground sm:truncate" title={u.headline}>
              {u.headline}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
