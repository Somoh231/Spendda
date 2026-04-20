import type { DemoPackId, OnboardingProfile } from "./types";
import type { GenerateOptions } from "@/lib/demo-data/generate";
import type { Sector } from "@/lib/demo-data/types";

export type DemoPackMeta = {
  id: DemoPackId;
  label: string;
  description: string;
  organizationName: string;
  seedOffset: number;
  sector: Sector;
};

export const DEMO_PACKS: DemoPackMeta[] = [
  {
    id: "default",
    label: "Default accountability dataset",
    description: "Balanced multi-ministry / multi-region public finance demo.",
    organizationName: "Republic Public Finance Authority",
    seedOffset: 0,
    sector: "Government",
  },
  {
    id: "liberia-mof",
    label: "Liberia Ministry of Finance",
    description: "National treasury posture with regional variance and audit pressure.",
    organizationName: "Liberia Ministry of Finance",
    seedOffset: 17,
    sector: "Government",
  },
  {
    id: "east-africa-university",
    label: "East Africa University Network",
    description: "Multi-campus grants, faculty payroll, and board reporting signals.",
    organizationName: "East Africa University Network",
    seedOffset: 41,
    sector: "Education",
  },
  {
    id: "mercy-regional-hospital",
    label: "Mercy Regional Hospital",
    description: "Clinical units, overtime pressure, supplier concentration, and cost trends.",
    organizationName: "Mercy Regional Hospital",
    seedOffset: 63,
    sector: "Healthcare",
  },
  {
    id: "global-ngo-relief",
    label: "Global NGO Relief Fund",
    description: "Programs, field offices, donor utilization, and compliance reporting.",
    organizationName: "Global NGO Relief Fund",
    seedOffset: 89,
    sector: "Nonprofit",
  },
];

const LOOKUP = Object.fromEntries(DEMO_PACKS.map((p) => [p.id, p])) as Record<DemoPackId, DemoPackMeta>;

export function demoPackMeta(id: DemoPackId | undefined): DemoPackMeta {
  const k = id && LOOKUP[id] ? id : "default";
  return LOOKUP[k];
}

function hashClientId(id: string) {
  // simple stable hash for seed variation
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function generateOptionsFromProfile(
  profile: OnboardingProfile | null,
  opts?: { clientId?: string | null },
): GenerateOptions {
  if (!profile) return {};
  const pack = demoPackMeta(profile.demoPackId);
  const cid = opts?.clientId?.trim();
  const clientSeedOffset = cid ? hashClientId(cid) % 10_000 : 0;
  return {
    seed: 1337 + pack.seedOffset + clientSeedOffset,
    organizationName: pack.organizationName,
    sector: pack.sector,
    demoPackId: pack.id,
    tenantKey: cid || undefined,
  };
}
