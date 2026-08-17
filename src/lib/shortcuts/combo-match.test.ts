import { describe, it, expect } from "vitest";
import {
  parseCombo,
  comboKey,
  matchCombo,
  isModifierOnly,
  validateCombo,
} from "./combo";

describe("comboKey", () => {
  it("normalizes combo for dedup", () => {
    expect(comboKey(parseCombo("Ctrl+Shift+S"))).toBe("ctrl+shift+s");
    expect(comboKey(parseCombo("ctrl+shift+s"))).toBe("ctrl+shift+s");
  });

  it("orders modifiers consistently", () => {
    const a = comboKey(parseCombo("shift+ctrl+s"));
    const b = comboKey(parseCombo("ctrl+shift+s"));
    expect(a).toBe(b);
  });
});

describe("matchCombo", () => {
  function fakeEvent(
    key: string,
    opts: { ctrl?: boolean; shift?: boolean; alt?: boolean; meta?: boolean } = {},
  ): KeyboardEvent {
    return new KeyboardEvent("keydown", {
      key,
      ctrlKey: opts.ctrl ?? false,
      shiftKey: opts.shift ?? false,
      altKey: opts.alt ?? false,
      metaKey: opts.meta ?? false,
    });
  }

  it("matches ctrl+d event", () => {
    const combo = parseCombo("ctrl+d");
    expect(matchCombo(combo, fakeEvent("d", { ctrl: true }))).toBe(true);
  });

  it("matches ctrl+shift+s event", () => {
    const combo = parseCombo("ctrl+shift+s");
    expect(matchCombo(combo, fakeEvent("s", { ctrl: true, shift: true }))).toBe(true);
  });

  it("does not match when modifier missing", () => {
    const combo = parseCombo("ctrl+d");
    expect(matchCombo(combo, fakeEvent("d"))).toBe(false);
  });

  it("does not match when extra modifier pressed", () => {
    const combo = parseCombo("ctrl+d");
    expect(matchCombo(combo, fakeEvent("d", { ctrl: true, shift: true }))).toBe(false);
  });

  it("matches plain / with no modifier", () => {
    const combo = parseCombo("/");
    expect(matchCombo(combo, fakeEvent("/"))).toBe(true);
  });

  it("does not match plain / when ctrl held", () => {
    const combo = parseCombo("/");
    expect(matchCombo(combo, fakeEvent("/", { ctrl: true }))).toBe(false);
  });

  it("matches meta on Mac when event has meta", () => {
    const combo = parseCombo("meta+d");
    expect(matchCombo(combo, fakeEvent("d", { meta: true }))).toBe(true);
  });
});

describe("isModifierOnly", () => {
  it("returns true for modifier-only combos", () => {
    expect(isModifierOnly("ctrl+")).toBe(true);
    expect(isModifierOnly("shift+alt+")).toBe(true);
  });

  it("returns false for combos with a key", () => {
    expect(isModifierOnly("ctrl+d")).toBe(false);
    expect(isModifierOnly("/")).toBe(false);
  });
});

describe("validateCombo", () => {
  it("returns null for valid combos", () => {
    expect(validateCombo("ctrl+d")).toBeNull();
    expect(validateCombo("ctrl+shift+s")).toBeNull();
    expect(validateCombo("ctrl+/")).toBeNull();
  });

  it("rejects modifier-only combos", () => {
    expect(validateCombo("ctrl+")).toBe("modifiers_only");
  });

  it("rejects unknown modifier names", () => {
    expect(validateCombo("foo+d")).toBe("invalid_modifier");
  });

  it("rejects single-character combos without modifier", () => {
    expect(validateCombo("a")).toBe("needs_modifier");
  });

  it("allows multi-char keys without modifier (e.g. F1)", () => {
    expect(validateCombo("ctrl+f1")).toBeNull();
  });
});
