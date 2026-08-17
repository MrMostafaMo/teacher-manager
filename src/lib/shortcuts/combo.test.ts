import { describe, it, expect } from "vitest";
import { parseCombo, formatCombo } from "./combo";

describe("parseCombo", () => {
  it("parses simple ctrl+key", () => {
    expect(parseCombo("ctrl+d")).toEqual({
      ctrl: true,
      shift: false,
      alt: false,
      meta: false,
      key: "d",
    });
  });

  it("parses ctrl+shift+key", () => {
    expect(parseCombo("ctrl+shift+s")).toEqual({
      ctrl: true,
      shift: true,
      alt: false,
      meta: false,
      key: "s",
    });
  });

  it("parses meta+key (Mac Cmd)", () => {
    expect(parseCombo("meta+d")).toEqual({
      ctrl: false,
      shift: false,
      alt: false,
      meta: true,
      key: "d",
    });
  });

  it("parses alt+key", () => {
    expect(parseCombo("alt+k")).toEqual({
      ctrl: false,
      shift: false,
      alt: true,
      meta: false,
      key: "k",
    });
  });

  it("parses plain key with no modifier", () => {
    expect(parseCombo("/")).toEqual({
      ctrl: false,
      shift: false,
      alt: false,
      meta: false,
      key: "/",
    });
  });

  it("normalizes key to lowercase", () => {
    expect(parseCombo("ctrl+D").key).toBe("d");
  });
});

describe("formatCombo", () => {
  it("formats ctrl+key", () => {
    expect(
      formatCombo({
        ctrl: true,
        shift: false,
        alt: false,
        meta: false,
        key: "d",
      }),
    ).toBe("Ctrl+D");
  });

  it("formats ctrl+shift+key", () => {
    expect(
      formatCombo({
        ctrl: true,
        shift: true,
        alt: false,
        meta: false,
        key: "s",
      }),
    ).toBe("Ctrl+Shift+S");
  });

  it("formats alt+key", () => {
    expect(
      formatCombo({
        ctrl: false,
        shift: false,
        alt: true,
        meta: false,
        key: "/",
      }),
    ).toBe("Alt+/");
  });

  it("formats plain key", () => {
    expect(
      formatCombo({
        ctrl: false,
        shift: false,
        alt: false,
        meta: false,
        key: "/",
      }),
    ).toBe("/");
  });

  it("formats meta key with ⌘ on macOS", () => {
    expect(
      formatCombo(
        {
          ctrl: false,
          shift: false,
          alt: false,
          meta: true,
          key: "d",
        },
        true,
      ),
    ).toBe("⌘D");
  });
});
