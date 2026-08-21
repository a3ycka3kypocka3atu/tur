import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/database.types";
import { isSupabaseConfigured } from "@/lib/site";

export function createClient() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured for this environment.");
  }

  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
