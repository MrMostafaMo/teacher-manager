import { afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  applyTheme,
  DEFAULT_PRESET,
  isThemePreset,
  readInitialPreset,
  readInitialTheme,
  STORAGE_KEY,
  useThemeStore,
} from "./theme-store";

function stubMatchMedia(matches: boolean): void {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

beforeAll(() => stubMatchMedia(false));

afterEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove("dark");
  delete document.documentElement.dataset.theme;
  useThemeStore.setState({ theme: "system", preset: DEFAULT_PRESET });
});

describe("applyTheme", () => {
  it("toggles the dark class for the resolved mode", () => {
    applyTheme("dark", "nile");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    applyTheme("light", "nile");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("resolves system mode from matchMedia", () => {
    stubMatchMedia(true);
    expect(applyTheme("system", "nile")).toBe("dark");
  });

  it("sets the data-theme preset attribute", () => {
    applyTheme("light", "warm");
    expect(document.documentElement.dataset.theme).toBe("warm");
  });

  it("defaults the preset to nile", () => {
    applyTheme("light");
    expect(document.documentElement.dataset.theme).toBe("nile");
  });
});

describe("persisted reads", () => {
  it("readInitialTheme defaults to system on empty storage", () => {
    expect(readInitialTheme()).toBe("system");
  });

  it("readInitialPreset defaults to nile on empty storage", () => {
    expect(readInitialPreset()).toBe(DEFAULT_PRESET);
  });

  it("readInitialPreset reads a persisted preset", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ state: { preset: "academy" } }));
    expect(readInitialPreset()).toBe("academy");
  });

  it("readInitialPreset ignores unknown values", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ state: { preset: "neon" } }));
    expect(readInitialPreset()).toBe(DEFAULT_PRESET);
  });

  it("isThemePreset guards the union", () => {
    expect(isThemePreset("midnight")).toBe(true);
    expect(isThemePreset("neon")).toBe(false);
    expect(isThemePreset(undefined)).toBe(false);
  });
});

describe("useThemeStore", () => {
  it("setPreset persists to localStorage", () => {
    useThemeStore.getState().setPreset("warm");
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as {
      state?: { preset?: string };
    };
    expect(stored.state?.preset).toBe("warm");
  });
});