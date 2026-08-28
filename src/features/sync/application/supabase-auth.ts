/**
 * Supabase Auth use-cases — email/password + sign-out.
 * Pure fetch over auth/v1, no SDK.
 */
import { SYNC_META_KEYS, setSyncMeta, clearSupabaseMeta } from "../infrastructure/sync-state-repo";
import { getSupabaseConfig } from "../infrastructure/supabase-client";

interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: { id: string; email?: string };
}

async function authFetch(
  config: { url: string; anonKey: string },
  path: string,
  body: object,
  fetchImpl: typeof fetch = fetch,
): Promise<AuthResponse> {
  const res = await fetchImpl(`${config.url}/auth/v1/${path}`, {
    method: "POST",
    headers: { apikey: config.anonKey, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as AuthResponse & { msg?: string; error_description?: string };
  if (!res.ok) throw new Error(json.error_description ?? json.msg ?? `auth ${res.status}`);
  return json;
}

async function persistSession(data: AuthResponse): Promise<string> {
  await setSyncMeta(SYNC_META_KEYS.supabaseAccessToken, data.access_token);
  await setSyncMeta(SYNC_META_KEYS.supabaseRefreshToken, data.refresh_token);
  await setSyncMeta(SYNC_META_KEYS.supabaseExpiresAt, Date.now() + data.expires_in * 1000);
  await setSyncMeta(SYNC_META_KEYS.supabaseUserId, data.user.id);
  await setSyncMeta(SYNC_META_KEYS.supabaseEmail, data.user.email ?? "");
  return data.user.email ?? "";
}

export async function supabaseSignUp(
  email: string,
  password: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const config = await getSupabaseConfig();
  if (!config) throw new Error("supabase not configured");
  const data = await authFetch(config, "signup", { email, password }, fetchImpl);
  return persistSession(data);
}

export async function supabaseSignIn(
  email: string,
  password: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const config = await getSupabaseConfig();
  if (!config) throw new Error("supabase not configured");
  const data = await authFetch(config, "token?grant_type=password", { email, password }, fetchImpl);
  return persistSession(data);
}

export async function supabaseSignOut(): Promise<void> {
  const config = await getSupabaseConfig();
  const token = await (await import("../infrastructure/sync-state-repo")).getSyncMeta(
    SYNC_META_KEYS.supabaseAccessToken,
  );
  if (config && token) {
    await fetch(`${config.url}/auth/v1/logout`, {
      method: "POST",
      headers: { apikey: config.anonKey, Authorization: `Bearer ${token}` },
    }).catch(() => undefined);
  }
  await clearSupabaseMeta();
}

export async function configureSupabase(url: string, anonKey: string): Promise<void> {
  await setSyncMeta(SYNC_META_KEYS.supabaseUrl, url.trim());
  await setSyncMeta(SYNC_META_KEYS.supabaseAnonKey, anonKey.trim());
}
