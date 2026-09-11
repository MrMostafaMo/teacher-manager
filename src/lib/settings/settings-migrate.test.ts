import { beforeEach, describe, expect, it } from "vitest";
import { migrateLegacySettings } from "./settings-migrate";

beforeEach(() => localStorage.clear());

function seed(key: string, state: unknown) {
  localStorage.setItem(key, JSON.stringify({ state }));
}

describe("migrateLegacySettings", () => {
  it("returns defaults when nothing is stored", () => {
    const out = migrateLegacySettings(undefined, 0);
    expect(out.theme).toBe("system");
    expect(out.language).toBe("ar");
    expect(out.sessionsPerCycle).toBe(8);
  });

  it("imports the eight legacy keys", () => {
    seed("tm-theme", { theme: "dark", preset: "warm", customPrimary: null });
    seed("tm-language", { language: "en" });
    seed("tm-time", { hour24: true });
    seed("tm-week", { weekStartsOn: 6 });
    seed("tm-sidebar-pin", { isPinned: true });
    seed("tm-session-settings", { billingMode: "sessions", sessionsPerCycle: 10, warningAt: 8 });
    seed("tm-notification-settings", { enabled: false, osBanners: false, mutedTypes: { a: true } });
    seed("tm-shortcuts", { shortcuts: { save: "Ctrl+S", bad: 42 } });
    const out = migrateLegacySettings(undefined, 0);
    expect(out).toMatchObject({
      theme: "dark",
      preset: "warm",
      language: "en",
      hour24: true,
      weekStartsOn: 6,
      isPinned: true,
      billingMode: "sessions",
      sessionsPerCycle: 10,
      warningAt: 8,
      notificationsEnabled: false,
    });
    expect(out.shortcuts).toEqual({ save: "Ctrl+S" });
  });

  it("drops invalid values and survives corrupted JSON", () => {
    localStorage.setItem("tm-theme", "{broken");
    seed("tm-week", { weekStartsOn: 3 });
    seed("tm-session-settings", { sessionsPerCycle: 99, warningAt: 0 });
    const out = migrateLegacySettings(undefined, 0);
    expect(out.theme).toBe("system");
    expect(out.weekStartsOn).toBe(0);
    expect(out.sessionsPerCycle).toBe(8);
  });

  it("keeps v1 snapshots without legacy import", () => {
    const out = migrateLegacySettings({ language: "en" }, 1);
    expect(out.language).toBe("en");
    expect(out.theme).toBe("system");
  });
});
