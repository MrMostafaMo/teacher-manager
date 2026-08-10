/**
 * Enforces a per-file line cap across the TypeScript source tree.
 *
 * Hard cap: 200 lines (fails the build, exit 1).
 * Soft target: 150 lines (warns only — this is where new files should land).
 *
 * Overrides:
 *   - `FILE_MAX_LINES=NNN`  change the hard cap
 *   - `FILE_CHECK_SKIP=1`   skip the check entirely (used during refactor)
 *
 * Exclusions: generated SQL migrations, the Rust side, build artifacts.
 *
 * Usage: pnpm lint:files   (also runs as part of `pnpm build`)
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const hardCap = Number.parseInt(process.env.FILE_MAX_LINES ?? "200", 10);
const softTarget = 150;
const skip = process.env.FILE_CHECK_SKIP === "1";

// `components/` holds shadcn-generated primitives (upstream, not hand-maintained).
const ignored = new Set(["node_modules", ".git", "dist", "drizzle", "src-tauri", "components"]);
const includeExtensions = new Set([".ts", ".tsx"]);

function collect(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      collect(full, acc);
    } else if (includeExtensions.has(entry.name.slice(entry.name.lastIndexOf(".")))) {
      acc.push(full);
    }
  }
  return acc;
}

if (skip) {
  console.log("file-length check skipped (FILE_CHECK_SKIP=1)");
  process.exit(0);
}

const files = collect(root);
const over = [];
const overSoft = [];

for (const file of files) {
  const lines = readFileSync(file, "utf8").split("\n").length;
  const rel = relative(root, file);
  if (lines > hardCap) over.push({ rel, lines });
  else if (lines > softTarget) overSoft.push({ rel, lines });
}

overSoft.sort((a, b) => b.lines - a.lines);
for (const { rel, lines } of overSoft) {
  console.log(`\x1b[33mwarn\x1b[0m ${rel}: ${lines} lines (>${softTarget})`);
}

if (over.length > 0) {
  over.sort((a, b) => b.lines - a.lines);
  console.error("");
  for (const { rel, lines } of over) {
    console.error(`\x1b[31merror\x1b[0m ${rel}: ${lines} lines (cap ${hardCap})`);
  }
  console.error(`\n${over.length} file(s) exceed the ${hardCap}-line cap.`);
  process.exit(1);
}

if (overSoft.length > 0) {
  console.log(`\n${overSoft.length} file(s) over the ${softTarget}-line soft target.`);
} else {
  console.log(`All source files are within ${softTarget} lines.`);
}
