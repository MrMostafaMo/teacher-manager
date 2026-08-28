/**
 * Supabase credential lifecycle — access/refresh/user persistence.
 */
import { SYNC_META_KEYS, getSyncMeta, setSyncMeta } from "../infrastructure/sync-state-repo";
import { getSupabaseConfig } from "../infrastructure/supabase-client";
import type { SupabaseDeps } from "../infrastructure/supabase-http";
import { SupabaseError } from "../infrastructure/supabase-http";

export async function isSupabaseConfigured(): Promise<boolean> {
  const [url, token] = await Promise.all([
    getSupabaseConfig(),
    getSyncMeta(SYNC_META_KEYS.supabaseAccessToken),
  ]);
  return url !== null && token !== null;
}

export async function isSupabaseConnected(): Promise<boolean> {
  return isSupabaseConfigured();
}

export async function buildSupabaseSession(fetchImpl: typeof fetch = fetch): Promise<SupabaseDeps> {
  const config = await getSupabaseConfig();
  if (!config) throw new SupabaseError("unauthorized", "supabase not configured");
  const refreshToken = await getSyncMeta(SYNC_META_KEYS.supabaseRefreshToken);
  if (!refreshToken) throw new SupabaseError("unauthorized", "no refresh token");
  let cachedToken = await getSyncMeta(SYNC_META_KEYS.supabaseAccessToken);
  let cachedExpiry = Number((await getSyncMeta(SYNC_META_KEYS.supabaseExpiresAt)) ?? 0);

  async function refresh(): Promise<string | null> {
    const res = await fetchImpl(`${config!.url}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { apikey: config!.anonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) throw new SupabaseError("unauthorized", "refresh failed");
    const json = (await res.json()) as { access_token?: string; expires_in?: number };
    const fresh = json.access_token ?? null;
    if (!fresh) throw new SupabaseError("unauthorized", "no token");
    cachedToken = fresh;
    cachedExpiry = Date.now() + (json.expires_in ?? 3600) * 1000;
    await setSyncMeta(SYNC_META_KEYS.supabaseAccessToken, fresh);
    await setSyncMeta(SYNC_META_KEYS.supabaseExpiresAt, cachedExpiry);
    return fresh;
  }

  return {
    getToken: async () => {
      if (cachedToken && cachedExpiry > Date.now() + 60_000) return cachedToken;
      return refresh();
    },
    refresh,
    fetchImpl,
  };
}
