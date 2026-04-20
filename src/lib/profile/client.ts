"use client";

import * as React from "react";
import type { OnboardingProfile } from "@/lib/profile/types";
import { useClientSession } from "@/hooks/use-client-session";

const LS_KEY = "spendda_profile_v1";

function keyForClient(clientId?: string | null) {
  const id = clientId?.trim();
  return id ? `${LS_KEY}:${id}` : LS_KEY;
}

function safeParse(raw: string | null): OnboardingProfile | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OnboardingProfile;
  } catch {
    return null;
  }
}

export function useProfile() {
  const { client } = useClientSession();
  const clientId = client?.clientId ?? null;
  const [profile, setProfile] = React.useState<OnboardingProfile | null>(null);

  React.useEffect(() => {
    const k = keyForClient(clientId);
    setProfile(safeParse(window.localStorage.getItem(k)));
    const onStorage = (e: StorageEvent) => {
      if (e.key === k) setProfile(safeParse(e.newValue));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [clientId]);

  function update(next: OnboardingProfile) {
    const k = keyForClient(clientId);
    window.localStorage.setItem(k, JSON.stringify(next));
    setProfile(next);
  }

  return { profile, setProfile: update };
}

