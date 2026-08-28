/**
 * Supabase Storage provider for the SyncProvider contract.
 * Stores sync-data.json and backups in the `sync` bucket.
 * Uses plain REST so no SDK is bundled.
 */
import type { SyncDownload, SyncProvider } from "../domain/sync-provider";
import { getSupabaseConfig, supabaseHeaders } from "./supabase-client";
import { buildSupabaseSession, isSupabaseConfigured } from "../application/supabase-session";
import { SYNC_META_KEYS, getSyncMeta } from "./sync-state-repo";
import { SupabaseError, supabaseFetch } from "./supabase-http";

const BUCKET = "sync";

async function payloadPath(): Promise<string> {
  const userId = await getSyncMeta(SYNC_META_KEYS.supabaseUserId);
  return userId ? `${userId}/sync-data.json` : "sync-data.json";
}

async function scopedPrefix(folderName: string): Promise<string> {
  const userId = await getSyncMeta(SYNC_META_KEYS.supabaseUserId);
  return userId ? `${userId}/${folderName}` : folderName;
}

async function scopedPath(folderName: string, fileName: string): Promise<string> {
  const prefix = await scopedPrefix(folderName);
  return `${prefix}/${fileName}`;
}

export class SupabaseProvider implements SyncProvider {
  readonly id = "supabase" as const;

  async isConfigured(): Promise<boolean> {
    return isSupabaseConfigured();
  }

  async download(): Promise<SyncDownload | null> {
    const config = await getSupabaseConfig();
    if (!config) return null;
    const deps = await buildSupabaseSession();
    const path = await payloadPath();
    const url = `${config.url}/storage/v1/object/${BUCKET}/${path}`;
    try {
      const res = await supabaseFetch(deps, url, { method: "GET" });
      const text = await res.text();
      const etag = res.headers.get("etag");
      return { text, etag };
    } catch (error) {
      const msg = error instanceof Error ? error.message : "";
      const isMissing = msg.includes("404") || msg.includes("400") || (error instanceof SupabaseError && error.message.includes("404"));
      if (isMissing) {
        // Fallback to legacy shared path for migration
        if (path !== "sync-data.json") {
          try {
            const legacyUrl = `${config.url}/storage/v1/object/${BUCKET}/sync-data.json`;
            const res = await supabaseFetch(deps, legacyUrl, { method: "GET" });
            return { text: await res.text(), etag: res.headers.get("etag") };
          } catch {
            return null;
          }
        }
        return null;
      }
      throw error;
    }
  }

  async upload(text: string, etag: string | null): Promise<void> {
    const config = await getSupabaseConfig();
    if (!config) throw new SupabaseError("unauthorized", "not configured");
    const deps = await buildSupabaseSession();
    const path = await payloadPath();
    const url = `${config.url}/storage/v1/object/${BUCKET}/${path}`;
    const token = await deps.getToken();
    if (!token) throw new SupabaseError("unauthorized", "no token");
    const headers: Record<string, string> = { ...supabaseHeaders(config, token), "Content-Type": "application/json", "x-upsert": "true" };
    if (etag) headers["If-Match"] = etag;
    const res = await (deps.fetchImpl ?? fetch)(url, {
      method: "POST",
      headers,
      body: text,
    });
    if (res.status === 412) throw new SupabaseError("conflict", "etag mismatch");
    if (!res.ok && res.status !== 200 && res.status !== 201) {
      if (res.status === 409 || res.status === 400) {
        const putHeaders: Record<string, string> = { ...supabaseHeaders(config, token), "Content-Type": "application/json" };
        if (etag) putHeaders["If-Match"] = etag;
        const put = await (deps.fetchImpl ?? fetch)(url, {
          method: "PUT",
          headers: putHeaders,
          body: text,
        });
        if (put.status === 412) throw new SupabaseError("conflict", "etag mismatch");
        if (!put.ok) throw new SupabaseError("other", `upload failed ${put.status}`);
        return;
      }
      throw new SupabaseError("other", `upload failed ${res.status}`);
    }
  }

  async uploadBytes(fileName: string, bytes: Uint8Array, folderName: string): Promise<void> {
    const config = await getSupabaseConfig();
    if (!config) throw new SupabaseError("unauthorized", "not configured");
    const deps = await buildSupabaseSession();
    const path = await scopedPath(folderName, fileName);
    const url = `${config.url}/storage/v1/object/${BUCKET}/${path}`;
    const token = await deps.getToken();
    if (!token) throw new SupabaseError("unauthorized", "no token");
    const res = await (deps.fetchImpl ?? fetch)(url, {
      method: "POST",
      headers: { ...supabaseHeaders(config, token), "Content-Type": "application/octet-stream", "x-upsert": "true" },
      body: bytes as unknown as BodyInit,
    });
    if (!res.ok) throw new SupabaseError("other", `uploadBytes failed ${res.status}`);
  }

  async listFiles(folderName: string): Promise<Array<{ id: string; name: string }>> {
    const config = await getSupabaseConfig();
    if (!config) return [];
    const deps = await buildSupabaseSession();
    const prefix = await scopedPrefix(folderName);
    const url = `${config.url}/storage/v1/object/list/${BUCKET}`;
    const res = await supabaseFetch(deps, url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefix, limit: 100, sortBy: { column: "created_at", order: "desc" } }),
    });
    const json = (await res.json()) as Array<{ name: string; id?: string }>;
    const scoped = json.map((f) => ({ id: `${prefix}/${f.name}`, name: f.name }));
    if (scoped.length > 0 || prefix === folderName) return scoped;
    // Fallback to legacy shared folder (pre-scoped backups)
    try {
      const legacyRes = await supabaseFetch(deps, url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefix: folderName, limit: 100, sortBy: { column: "created_at", order: "desc" } }),
      });
      const legacy = (await legacyRes.json()) as Array<{ name: string; id?: string }>;
      return legacy.map((f) => ({ id: `${folderName}/${f.name}`, name: f.name }));
    } catch {
      return scoped;
    }
  }

  async downloadBytes(fileId: string): Promise<Uint8Array> {
    const config = await getSupabaseConfig();
    if (!config) throw new SupabaseError("unauthorized", "not configured");
    const deps = await buildSupabaseSession();
    const url = `${config.url}/storage/v1/object/${BUCKET}/${fileId}`;
    const res = await supabaseFetch(deps, url, { method: "GET" });
    return new Uint8Array(await res.arrayBuffer());
  }
}
