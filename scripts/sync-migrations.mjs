/**
 * Syncs drizzle-kit generated migrations into `src-tauri/migrations/`
 * so the Tauri SQL plugin can embed and auto-apply them at launch.
 *
 * drizzle-kit separates statements with `--> statement-breakpoint` comment
 * lines; those are stripped (the plugin's runner splits on `;`).
 *
 * After running this, update the MIGRATIONS list in `src-tauri/src/lib.rs`
 * to include any new file.
 *
 * Usage: pnpm db:sync
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const srcDir = join(root, "drizzle");
const outDir = join(root, "src-tauri", "migrations");

mkdirSync(outDir, { recursive: true });

const files = readdirSync(srcDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

if (files.length === 0) {
  console.log("No migrations in drizzle/ — run `pnpm db:generate` first.");
  process.exit(1);
}

for (const file of files) {
  const sql = readFileSync(join(srcDir, file), "utf8")
    .split("\n")
    .filter((line) => !line.trim().startsWith("-->"))
    .join("\n")
    .trim();
  writeFileSync(join(outDir, file), sql + "\n");
  console.log(`synced ${file}`);
}

console.log(`\n${files.length} migration(s) synced to src-tauri/migrations/`);
