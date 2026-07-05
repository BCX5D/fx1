import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Supabase browser client. The publishable key is intentionally client-visible;
 * all data access is guarded by Row-Level Security policies scoped to auth.uid(),
 * so a user can only ever read or write their own lp_* rows.
 */
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabaseEnabled =
  import.meta.env.VITE_AUTH_MODE === "supabase" && !!url && !!key;

export const supabase =
  supabaseEnabled
    ? createClient<Database>(url!, key!, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null;
