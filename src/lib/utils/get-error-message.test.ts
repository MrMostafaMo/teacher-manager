import { describe, expect, it } from "vitest";
import { getErrorMessage } from "./get-error-message";

describe("getErrorMessage", () => {
  it("returns the message of a plain error", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });
  it("unwraps the cause chain (driver wrapper hiding the real failure)", () => {
    const root = new Error("no such column: one_off_date");
    const wrapped = new Error("Failed query: select ... params: ", { cause: root });
    expect(getErrorMessage(wrapped)).toBe(
      "Failed query: select ... params:  — no such column: one_off_date",
    );
  });
  it("stops on circular causes", () => {
    const err = new Error("loop") as Error & { cause?: unknown };
    err.cause = err;
    expect(getErrorMessage(err)).toBe("loop");
  });
  it("stringifies non-errors", () => {
    expect(getErrorMessage("plain")).toBe("plain");
    expect(getErrorMessage(42)).toBe("42");
  });
});
