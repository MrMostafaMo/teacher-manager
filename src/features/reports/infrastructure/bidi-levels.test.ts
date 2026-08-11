import { describe, expect, it } from "vitest";
import { splitRuns } from "./bidi-levels";

describe("splitRuns", () => {
  it("keeps a pure-Arabic word as one RTL run", () => {
    const runs = splitRuns("مرحبا", true);
    expect(runs).toEqual([{ text: "مرحبا", level: 1 }]);
  });

  it("keeps a pure-Latin word as one LTR run", () => {
    expect(splitRuns("Hello", false)).toEqual([{ text: "Hello", level: 0 }]);
  });

  it("raises Latin letters to level 2 under an RTL base", () => {
    expect(splitRuns("John", true)).toEqual([{ text: "John", level: 2 }]);
  });

  it("turns digits after an Arabic letter into AN (W2)", () => {
    const runs = splitRuns("محمد 2026", true);
    expect(runs.map((r) => r.text)).toEqual(["محمد ", "2026"]);
    expect(runs[0].level).toBe(1);
    expect(runs[1].level).toBe(2);
  });

  it("joins a digit run across a single separator (W4)", () => {
    const runs = splitRuns("12-30", false);
    expect(runs).toEqual([{ text: "12-30", level: 0 }]);
  });

  it("keeps a plain space between two digit runs as a level-1 neutral", () => {
    const runs = splitRuns("12 30", false);
    expect(runs.map((r) => r.level)).toEqual([0, 1, 0]);
  });

  it("lowers digits after a Latin letter to L (W7)", () => {
    expect(splitRuns("a5", false)).toEqual([{ text: "a5", level: 0 }]);
  });

  it("resolves edge neutrals against the base direction", () => {
    const runs = splitRuns(" مرحبا", true);
    expect(runs[0].level).toBe(1);
  });
});
