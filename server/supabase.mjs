const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export function assertSupabaseConfigured() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }
}

export function getSupabaseUrl() {
  assertSupabaseConfigured();
  return SUPABASE_URL;
}

export async function supabaseRequest(path, options = {}) {
  assertSupabaseConfigured();

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const message = data?.message || data?.error || `Supabase request failed (${response.status})`;
    throw new Error(message);
  }

  return data;
}

export function toClubDateTime(date, time) {
  return new Date(`${date}T${time}:00+03:00`);
}

export function endAtForBooking(date, time, duration) {
  return new Date(toClubDateTime(date, time).getTime() + Number(duration) * 60 * 60 * 1000);
}
