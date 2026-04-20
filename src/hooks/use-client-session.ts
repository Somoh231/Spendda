"use client";

import * as React from "react";

import type { ClientSession } from "@/lib/auth/client-cookie";

export type { ClientSession };

export function useClientSession() {
  const [mounted, setMounted] = React.useState(false);
  const [client, setClient] = React.useState<ClientSession | null>(null);
  const [portal, setPortal] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    setMounted(true);
    (async () => {
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as { client?: ClientSession | null; portal?: boolean };
        if (!alive) return;
        setClient(json.client ?? null);
        setPortal(Boolean(json.portal));
      } catch {
        // ignore
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return { mounted, client, portal };
}

