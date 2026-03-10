export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function getAppMode() {
  return isSupabaseConfigured() ? "live" : "demo";
}

export function getAppModeLabel() {
  return getAppMode() === "live" ? "Live Supabase mode" : "Demo mode";
}
