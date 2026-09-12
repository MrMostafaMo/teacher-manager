import { describe, expect, it } from "vitest";
import { countedSessionDays } from "./statement-days";

describe("countedSessionDays", () => {
  const day = (date: string, status: string) => ({ date, status });
  it("counts present/late/absent but never excused", () => {
    expect(
      countedSessionDays(
        [day("2026-08-01", "present"), day("2026-08-02", "late"), day("2026-08-03", "absent"), day("2026-08-04", "excused")],
        [],
      ),
    ).toBe(3);
  });
  it("dedups the same day across the daily roster and session sheets", () => {
    expect(
      countedSessionDays(
        [day("2026-08-01", "present")],
        [day("2026-08-01", "present"), day("2026-08-02", "late")],
      ),
    ).toBe(2);
  });
});
