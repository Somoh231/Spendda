/**
 * Prevent open redirects: only same-origin app paths are allowed after auth/onboarding.
 */
export function safePostAuthPath(raw: string | null | undefined, fallback = "/app/ai-workspace"): string {
  if (!raw || typeof raw !== "string") return fallback;
  const t = raw.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return fallback;
  if (t.includes("..") || t.includes("\\") || t.includes("@")) return fallback;
  if (!t.startsWith("/app")) return fallback;
  return t;
}
