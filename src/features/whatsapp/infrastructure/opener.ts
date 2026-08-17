import { isTauri } from "@/lib/tauri";

/**
 * Open a URL in the system browser via the opener plugin. Lazy-imported so
 * the Vite dev server and tests never load the Tauri plugin (mirrors
 * `src/lib/notify-system.ts`).
 */
export async function openExternal(url: string): Promise<void> {
  if (!isTauri()) {
    window.open(url, "_blank", "noopener");
    return;
  }
  try {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
  } catch (error) {
    console.error("Failed to open URL", error);
    throw error;
  }
}
