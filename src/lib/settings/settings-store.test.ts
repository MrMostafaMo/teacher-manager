import { beforeEach, describe, expect, it } from "vitest";
import { defaultSettings, useSettingsStore } from "./settings-store";

beforeEach(() => {
  useSettingsStore.setState({ ...defaultSettings });
});

describe("useSettingsStore setters", () => {
  it("updates theme slice fields", () => {
    useSettingsStore.getState().setTheme("dark");
    useSettingsStore.getState().setPreset("warm");
    useSettingsStore.getState().setCustomPrimary("#123456");
    const s = useSettingsStore.getState();
    expect(s.theme).toBe("dark");
    expect(s.preset).toBe("warm");
    expect(s.customPrimary).toBe("#123456");
  });

  it("toggles the sidebar pin", () => {
    expect(useSettingsStore.getState().isPinned).toBe(false);
    useSettingsStore.getState().togglePinned();
    expect(useSettingsStore.getState().isPinned).toBe(true);
    useSettingsStore.getState().setPinned(false);
    expect(useSettingsStore.getState().isPinned).toBe(false);
  });

  it("updates session slice fields", () => {
    useSettingsStore.getState().setBillingMode("sessions");
    useSettingsStore.getState().setSessionsPerCycle(10);
    useSettingsStore.getState().setWarningAt(8);
    const s = useSettingsStore.getState();
    expect(s.billingMode).toBe("sessions");
    expect(s.sessionsPerCycle).toBe(10);
    expect(s.warningAt).toBe(8);
  });

  it("updates notification fields via new and legacy names", () => {
    useSettingsStore.getState().setNotificationsEnabled(false);
    expect(useSettingsStore.getState().notificationsEnabled).toBe(false);
    useSettingsStore.getState().setEnabled(true);
    expect(useSettingsStore.getState().notificationsEnabled).toBe(true);
    useSettingsStore.getState().toggleMutedType("homework_overdue");
    expect(useSettingsStore.getState().mutedTypes).toEqual({ homework_overdue: true });
    useSettingsStore.getState().toggleType("homework_overdue");
    expect(useSettingsStore.getState().mutedTypes).toEqual({ homework_overdue: false });
  });

  it("toggles high contrast while remembering the prior preset", () => {
    const s = useSettingsStore.getState();
    s.setPreset("warm");
    s.setContrastEnabled(true);
    expect(useSettingsStore.getState().preset).toBe("contrast");
    expect(useSettingsStore.getState().lastNonContrast).toBe("warm");
    // Enabling twice keeps the original preset (no overwrite).
    s.setContrastEnabled(true);
    expect(useSettingsStore.getState().lastNonContrast).toBe("warm");
    s.setContrastEnabled(false);
    expect(useSettingsStore.getState().preset).toBe("warm");
  });

  it("falls back to nile when no prior preset was remembered", () => {
    useSettingsStore.getState().setContrastEnabled(false);
    expect(useSettingsStore.getState().preset).toBe("nile");
  });

  it("manages shortcuts with defaults fallback", () => {
    const s0 = useSettingsStore.getState();
    expect(s0.getDefault("nav:/")).toBe("ctrl+d");
    s0.setShortcut("nav:/", "ctrl+s");
    expect(useSettingsStore.getState().shortcuts["nav:/"]).toBe("ctrl+s");
    expect(useSettingsStore.getState().findDuplicate("nav:/students", "ctrl+s")).toBe("nav:/");
    s0.resetShortcut("nav:/");
    expect(useSettingsStore.getState().shortcuts["nav:/"]).toBe("ctrl+d");
    s0.setShortcut("nav:/", "ctrl+s");
    s0.resetShortcuts();
    expect(useSettingsStore.getState().shortcuts["nav:/"]).toBe("ctrl+d");
  });
});
