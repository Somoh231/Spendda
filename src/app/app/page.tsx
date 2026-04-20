import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PROFILE_COOKIE } from "@/lib/profile/cookie";

export default async function AppIndexRedirect() {
  // Server-side smart gateway. Auth is enforced in middleware.
  const cookieStore = await cookies();
  const hasProfile = Boolean(cookieStore.get(PROFILE_COOKIE)?.value);
  redirect(hasProfile ? "/app/ai-workspace" : "/app/onboarding?redirectTo=%2Fapp%2Fai-workspace");
}

