import type { OnboardingProfile } from "@/lib/profile/types";

export const PROFILE_COOKIE = "spendda_profile";

export function encodeProfile(profile: OnboardingProfile) {
  const json = JSON.stringify(profile);
  // base64url
  return Buffer.from(json, "utf8").toString("base64url");
}

export function decodeProfile(value: string): OnboardingProfile | null {
  try {
    const json = Buffer.from(value, "base64url").toString("utf8");
    return JSON.parse(json) as OnboardingProfile;
  } catch {
    return null;
  }
}

