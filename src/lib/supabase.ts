import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigured = Boolean(url && anonKey && !url.includes("xxxx"));

export const supabase: SupabaseClient = supabaseConfigured
  ? createClient(url!, anonKey!)
  : (null as unknown as SupabaseClient);

export function requireSupabase(): SupabaseClient {
  if (!supabaseConfigured) {
    throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }
  return supabase;
}
