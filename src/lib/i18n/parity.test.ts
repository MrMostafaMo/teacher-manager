import { describe, expect, it } from "vitest";
import { en } from "@/lib/i18n/en";
import { ar } from "@/lib/i18n/ar";

function keys(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];
  const out: string[] = [];
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "object" && v !== null && !Array.isArray(v)) out.push(...keys(v, path));
    else out.push(path);
  }
  return out;
}

function get(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, k) => {
    if (typeof acc !== "object" || acc === null) return undefined;
    return (acc as Record<string, unknown>)[k];
  }, obj);
}

describe("i18n parity", () => {
  it("ar has every en key and en has every ar key", () => {
    const enKeys = new Set(keys(en));
    const arKeys = new Set(keys(ar));
    const missingInAr = [...enKeys].filter((k) => !arKeys.has(k));
    const missingInEn = [...arKeys].filter((k) => !enKeys.has(k));
    expect({ missingInAr, missingInEn }).toEqual({ missingInAr: [], missingInEn: [] });
  });

  it("array-typed headers keep matching lengths", () => {
    const arrayPaths = keys(en).filter((k) => Array.isArray(get(en, k)));
    expect(arrayPaths.length).toBeGreaterThan(0);
    for (const path of arrayPaths) {
      const a = get(ar, path);
      const e = get(en, path) as unknown[];
      expect(Array.isArray(a), path).toBe(true);
      expect((a as unknown[]).length, path).toBe(e.length);
    }
  });
});
