const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function hasSupabaseReadConfig() {
  return Boolean(supabaseUrl && anonKey);
}

export function hasSupabaseServiceConfig() {
  return Boolean(supabaseUrl && serviceRoleKey);
}

export function supabaseRestUrl(path: string) {
  if (!supabaseUrl) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured.");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${supabaseUrl}/rest/v1${normalizedPath}`;
}

export function supabaseReadHeaders() {
  if (!anonKey) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured.");
  return {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
  };
}

export function supabaseServiceHeaders() {
  if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
  };
}
