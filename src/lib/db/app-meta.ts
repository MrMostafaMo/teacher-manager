import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { appMeta } from "@/lib/db/schema";

export const META_SCHEMA_VERSION = "schema_version";

/** Read a single metadata value (null when absent). */
export async function getMeta(key: string): Promise<string | null> {
  const row = await db.select().from(appMeta).where(eq(appMeta.key, key)).get();
  return row?.value ?? null;
}

/** Insert-or-update a metadata value. */
export async function setMeta(key: string, value: string): Promise<void> {
  const ts = Date.now();
  const existing = await getMeta(key);
  if (existing === null) {
    await db.insert(appMeta).values({ key, value, createdAt: ts, updatedAt: ts });
  } else {
    await db.update(appMeta).set({ value, updatedAt: ts }).where(eq(appMeta.key, key)).run();
  }
}

/** Returns the persisted schema version, seeding it on first launch. */
export async function ensureSchemaVersion(version = "1"): Promise<string> {
  const existing = await getMeta(META_SCHEMA_VERSION);
  if (existing !== null) return existing;
  await setMeta(META_SCHEMA_VERSION, version);
  return version;
}

/** Touch the last-opened timestamp (used by the dashboard "last seen" info). */
export async function touchLastOpened(): Promise<void> {
  await setMeta("last_opened_at", String(Date.now()));
}
