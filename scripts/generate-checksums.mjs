/**
 * Generates a SHA256SUMS-<suffix>.txt manifest for the Tauri bundle artifacts
 * built on this CI runner (cross-platform: Windows, macOS, Linux).
 *
 * Scans `src-tauri/target/release/bundle` and every
 * `src-tauri/target/<triple>/release/bundle` dir, hashes installer files
 * (.exe, .msi, .dmg, .tar.gz, .deb, .rpm, .AppImage, .sig) and writes GNU
 * `sha256sum`-style lines so users can verify their download:
 *
 *   certutil -hashfile <file> SHA256        (Windows)
 *   sha256sum -c SHA256SUMS-<suffix>.txt    (macOS / Linux)
 *
 * Usage: node scripts/generate-checksums.mjs <suffix>
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const bundleRoots = ["release"];
for (const entry of readdirSync(join(root, "src-tauri", "target"), {
  withFileTypes: true,
})) {
  if (entry.isDirectory() && entry.name !== "debug") bundleRoots.push(entry.name);
}

const wanted = [".exe", ".msi", ".dmg", ".tar.gz", ".deb", ".rpm", ".AppImage", ".sig"];

function collect(dir, acc = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) collect(full, acc);
    else if (wanted.some((ext) => entry.name.endsWith(ext))) acc.push(full);
  }
  return acc;
}

const files = [];
for (const sub of bundleRoots) {
  collect(join(root, "src-tauri", "target", sub, "release", "bundle"), files);
}
// Deduplicate (e.g. `release` visited twice when no cross-targets exist).
const unique = [...new Set(files)].sort((a, b) => basename(a).localeCompare(basename(b)));

if (unique.length === 0) {
  console.error("generate-checksums: no bundle artifacts found under src-tauri/target");
  process.exit(1);
}

const suffix = process.argv[2] ?? "local";
const lines = unique.map((file) => {
  const hash = createHash("sha256").update(readFileSync(file)).digest("hex");
  const size = statSync(file).size;
  console.log(`${hash}  ${basename(file)} (${size} bytes)`);
  return `${hash}  ${basename(file)}`;
});

const outName = `SHA256SUMS-${suffix}.txt`;
writeFileSync(outName, `${lines.join("\n")}\n`);
console.log(`wrote ${outName} (${lines.length} file(s))`);
