/**
 * Supabase configuration helper — reads URL/anon key from sync_meta or env.
 * No SDK dependency; plain REST via fetch keeps the bundle small.
 */

import { SYNC_META_KEYS, getSyncMeta } from "./sync-state-repo";

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export async function getSupabaseConfig(): Promise<SupabaseConfig | null> {
  const [urlMeta, keyMeta] = await Promise.all([
    getSyncMeta(SYNC_META_KEYS.supabaseUrl),
    getSyncMeta(SYNC_META_KEYS.supabaseAnonKey),
  ]);
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "";
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "";
  let url = (urlMeta ?? envUrl).trim().replace(/\/$/, "");
  // ponytail: users paste /rest/v1/ suffix; strip it for Storage/Auth base
  if (url.endsWith("/rest/v1")) url = url.slice(0, -"/rest/v1".length);
  if (url.endsWith("/rest")) url = url.slice(0, -"/rest".length);
  url = url.replace(/\/$/, "");
  const anonKey = (keyMeta ?? envKey).trim();
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function supabaseHeaders(config: SupabaseConfig, accessToken?: string): Record<string, string> {
  const headers: Record<string, string> = { apikey: config.anonKey };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  return headers;
}
