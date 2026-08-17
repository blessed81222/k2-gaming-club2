import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
  );
}

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  }
);

export function assertSupabaseConfigured() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }
}

export function getSupabaseUrl() {
  assertSupabaseConfigured();
  return SUPABASE_URL;
}

export function toClubDateTime(date, time) {
  return new Date(`${date}T${time}:00+03:00`);
}

export function endAtForBooking(date, time, duration) {
  return new Date(
    toClubDateTime(date, time).getTime() +
      Number(duration) * 60 * 60 * 1000
  );
}