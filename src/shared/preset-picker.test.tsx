import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PresetPicker, THEME_PRESETS } from "./preset-picker";
import { DEFAULT_PRESET, useThemeStore } from "@/lib/theme/theme-store";
import i18n from "@/lib/i18n";

beforeAll(async () => {
  await i18n.changeLanguage("en");
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  useThemeStore.setState({ preset: DEFAULT_PRESET });
});

describe("PresetPicker", () => {
  it("renders one radio per preset", () => {
    render(<PresetPicker />);
    expect(screen.getAllByRole("radio")).toHaveLength(THEME_PRESETS.length);
  });

  it("marks the active preset as checked", () => {
    useThemeStore.setState({ preset: "warm" });
    render(<PresetPicker />);
    expect(screen.getByRole("radio", { name: /warm/i })).toHaveAttribute("aria-checked", "true");
  });

  it("switches the store preset on click", async () => {
    const user = userEvent.setup();
    render(<PresetPicker />);
    await user.click(screen.getByRole("radio", { name: /midnight/i }));
    expect(useThemeStore.getState().preset).toBe("midnight");
  });
});
