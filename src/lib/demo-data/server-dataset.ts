import { cookies } from "next/headers";

import { PROFILE_COOKIE, decodeProfile } from "@/lib/profile/cookie";
import { generateOptionsFromProfile } from "@/lib/profile/demo-packs";
import { CLIENT_COOKIE, decodeClientSession } from "@/lib/auth/client-cookie";

import { getDemoDataset } from "./cache";

/**
 * Resolves the demo dataset from the httpOnly profile cookie (demo pack + org flavor).
 * Use in Route Handlers only.
 */
export async function getRequestDemoDataset() {
  const jar = await cookies();
  const raw = jar.get(PROFILE_COOKIE)?.value;
  const profile = raw ? decodeProfile(raw) : null;
  const rawClient = jar.get(CLIENT_COOKIE)?.value;
  const client = rawClient ? decodeClientSession(rawClient) : null;
  const clientId = client?.clientId ?? null;

  // Prevent cross-tenant profile bleed if cookies get out of sync.
  const effectiveProfile = profile && profile.clientId && clientId && profile.clientId !== clientId ? null : profile;

  const opts = generateOptionsFromProfile(effectiveProfile, { clientId });
  return getDemoDataset(opts);
}
