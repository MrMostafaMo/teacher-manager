import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";

/**
 * Show the native save dialog and write `bytes` to the chosen path.
 * Returns true when a file was saved, false when the user cancelled.
 * Shared by every exporter (reports, rosters, receipts, statements).
 */
export async function saveFile(
  defaultPath: string,
  bytes: Uint8Array,
  filterName: string,
  extension: string,
): Promise<boolean> {
  const path = await save({
    defaultPath,
    filters: [{ name: filterName, extensions: [extension] }],
  });
  if (!path) return false;
  await writeFile(path, bytes);
  return true;
}
