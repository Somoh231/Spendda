import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

export async function requireSupabaseUser(): Promise<{ user: User | null; error: string | null }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { user: null, error: "Supabase not configured" };
  }
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { user: null, error: error?.message || "Not authenticated" };
  }
  return { user: data.user, error: null };
}

