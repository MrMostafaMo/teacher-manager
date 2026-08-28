/**
 * Supabase bearer fetch with refresh-and-retry on 401, parallel to drive-http.
 */
import { getSupabaseConfig, supabaseHeaders } from "./supabase-client";

export class SupabaseError extends Error {
  kind: "unauthorized" | "conflict" | "network" | "other";
  constructor(kind: "unauthorized" | "conflict" | "network" | "other", message: string) {
    super(message);
    this.kind = kind;
  }
}

export interface SupabaseDeps {
  getToken: () => Promise<string | null>;
  refresh: () => Promise<string | null>;
  fetchImpl?: typeof fetch;
}

export async function supabaseFetch(
  deps: SupabaseDeps,
  url: string,
  init: RequestInit,
): Promise<Response> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const config = await getSupabaseConfig();
  if (!config) throw new SupabaseError("unauthorized", "supabase not configured");
  const token = await deps.getToken();
  if (!token) throw new SupabaseError("unauthorized", "no token");

  const withAuth = (t: string): RequestInit => ({
    ...init,
    headers: { ...(init.headers ?? {}), ...supabaseHeaders(config, t) },
  });

  let res = await fetchImpl(url, withAuth(token));
  if (res.status === 401) {
    const fresh = await deps.refresh();
    if (!fresh) throw new SupabaseError("unauthorized", "refresh failed");
    res = await fetchImpl(url, withAuth(fresh));
  }
  if (!res.ok) {
    const kind =
      res.status === 409
        ? "conflict"
        : res.status >= 500
          ? "network"
          : res.status === 401
            ? "unauthorized"
            : "other";
    try {
      const text = await res.clone().text();
      console.error("[supabase] failed", res.status, url, text.slice(0, 500));
    } catch {
      // ignore
    }
    throw new SupabaseError(kind, `supabase ${res.status}`);
  }
  return res;
}
