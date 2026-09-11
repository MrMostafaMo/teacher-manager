import { afterEach, describe, expect, it, vi } from "vitest";
import { pickSettled } from "./dashboard-dimensions";

describe("pickSettled", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns the value when the dimension resolves", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const result: PromiseSettledResult<number[]> = { status: "fulfilled", value: [1, 2] };
    expect(pickSettled(result, "students", [])).toEqual([1, 2]);
    expect(error).not.toHaveBeenCalled();
  });

  it("logs the failing source and returns the fallback", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const reason = new Error("boom");
    const result: PromiseSettledResult<number[]> = { status: "rejected", reason };
    expect(pickSettled(result, "skills", [])).toEqual([]);
    expect(error).toHaveBeenCalledWith("Dashboard dimension failed: skills", reason);
  });
});
