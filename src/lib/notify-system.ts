import { isTauri } from "@/lib/tauri";

/** Fire an OS-level notification banner (no-op outside Tauri). The plugin is
 * lazy-imported so the Vite dev server and tests never load it. */
export async function notifySystem(title: string, body: string): Promise<void> {
  if (!isTauri()) return;
  try {
    const { sendNotification } = await import("@tauri-apps/plugin-notification");
    sendNotification({ title, body });
  } catch (error) {
    console.error("Failed to send system notification", error);
  }
}
