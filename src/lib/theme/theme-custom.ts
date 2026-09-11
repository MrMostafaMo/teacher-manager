const HEX_RE = /^#([0-9a-fA-F]{6})$/;

export function isValidHex(value: string): boolean {
  return HEX_RE.test(value);
}

function darkenHex(hex: string, amount = 0.15): string {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  const d = (c: number) => Math.max(0, Math.round(c * (1 - amount)));
  const toHex = (c: number) => c.toString(16).padStart(2, "0");
  return `#${toHex(d(r))}${toHex(d(g))}${toHex(d(b))}`;
}

export function applyCustomPrimary(color: string | null): void {
  const root = document.documentElement;
  if (!color || !isValidHex(color)) {
    root.style.removeProperty("--primary");
    root.style.removeProperty("--primary-strong");
    root.style.removeProperty("--ring");
    root.style.removeProperty("--sidebar-primary");
    root.style.removeProperty("--sidebar-ring");
    root.style.removeProperty("--chart-1");
    root.style.removeProperty("--accent");
    return;
  }
  const strong = darkenHex(color, 0.18);
  root.style.setProperty("--primary", color);
  root.style.setProperty("--primary-strong", strong);
  root.style.setProperty("--ring", color);
  root.style.setProperty("--sidebar-primary", color);
  root.style.setProperty("--sidebar-ring", color);
  root.style.setProperty("--chart-1", color);
  root.style.setProperty("--accent", `color-mix(in oklch, ${color} 14%, white)`);
}

/** Synchronous read of the persisted custom primary (if valid hex). */
export function readInitialCustomPrimary(): string | null {
  const pick = (value: unknown): string | null =>
    typeof value === "string" && isValidHex(value) ? value : null;
  for (const key of ["tm-settings", "tm-theme"]) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as { state?: { customPrimary?: unknown } };
      const hit = pick(parsed?.state?.customPrimary);
      if (hit) return hit;
    } catch {
      /* corrupted storage — try the next key */
    }
  }
  return null;
}
