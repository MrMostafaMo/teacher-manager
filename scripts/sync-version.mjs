#!/usr/bin/env node
/**
 * Reads version from package.json and writes it to:
 *   - src-tauri/Cargo.toml (line: version = "...")
 *   - src-tauri/tauri.conf.json ("version" field)
 *   - src/app/navigation.tsx (APP_VERSION constant)
 *
 * Usage: node scripts/sync-version.mjs [--check]
 *   --check  exits with code 1 if any file is out of sync (CI mode)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const pkg = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf-8"));
const version = pkg.version;

const targets = [
  {
    name: "Cargo.toml",
    path: resolve(ROOT, "src-tauri/Cargo.toml"),
    replace: (content) =>
      content.replace(/^(version\s*=\s*)"[^"]*"/m, `$1"${version}"`),
  },
  {
    name: "tauri.conf.json",
    path: resolve(ROOT, "src-tauri/tauri.conf.json"),
    replace: (content) => {
      const obj = JSON.parse(content);
      obj.version = version;
      return JSON.stringify(obj, null, 2) + "\n";
    },
  },
  {
    name: "navigation.tsx",
    path: resolve(ROOT, "src/app/navigation.tsx"),
    replace: (content) =>
      content.replace(
        /(APP_VERSION\s*=\s*)"[^"]*"/,
        `$1"${version}"`,
      ),
  },
];

const check = process.argv.includes("--check");
let failed = false;

for (const t of targets) {
  const content = readFileSync(t.path, "utf-8");
  const updated = t.replace(content);

  if (content === updated) {
    console.log(`  ✓ ${t.name} — already "${version}"`);
  } else if (check) {
    console.error(`  ✗ ${t.name} — out of sync (expected "${version}")`);
    failed = true;
  } else {
    writeFileSync(t.path, updated);
    console.log(`  → ${t.name} — updated to "${version}"`);
  }
}

if (failed) {
  console.error("\nVersion mismatch detected. Run: pnpm version:sync");
  process.exit(1);
} else {
  console.log(`\nAll sources at "${version}".`);
}
