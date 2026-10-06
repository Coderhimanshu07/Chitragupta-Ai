import { createClient } from "@supabase/supabase-js";

/* Read lazily: ESM imports are evaluated before index.js calls
   dotenv.config(), so anything captured at module scope would always
   see an empty process.env. */
function config() {
  return {
    url: process.env.SUPABASE_URL,
    /* Supabase renamed anon -> publishable (sb_publishable_...).
       Read both so older .env files keep working. */
    key:
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.SUPABASE_ANON_KEY
  };
}

export function supabaseReady() {
  const { url, key } = config();
  return Boolean(url && key);
}

/* Called per-request with the caller's token so Supabase applies RLS
   as that user. Never use a service-role key here - that would bypass RLS. */
export function clientForToken(token) {
  const { url, key } = config();
  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export async function getUser(token) {
  try {
    const { data, error } = await clientForToken(token).auth.getUser(token);
    if (error) return null;
    return data.user ?? null;
  } catch {
    return null;
  }
}