import { ensureSchemaVersion, touchLastOpened } from "@/lib/db/app-meta";
import { logActivity } from "@/lib/activity-log";

/**
 * Fires app metadata initialization on launch. Errors are non-fatal:
 * the app still opens, and the dashboard reports the failed state.
 */
export async function bootstrapDatabase(): Promise<void> {
  try {
    await ensureSchemaVersion();
    await touchLastOpened();
    await logActivity({ action: "app.launch", entityType: "app" });
  } catch (error) {
    console.error("Database bootstrap failed", error);
  }
}
