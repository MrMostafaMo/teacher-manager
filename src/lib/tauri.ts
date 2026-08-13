/** True when running inside the Tauri webview (guards plugin calls from the
 * Vite dev server and jsdom tests). */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}
