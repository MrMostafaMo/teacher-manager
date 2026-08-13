import { describe, expect, it } from "vitest";
import { cancelSessionSchema, moveSessionSchema } from "./domain";

describe("cancelSessionSchema", () => {
  it("accepts a valid sessionId + date", () => {
    expect(cancelSessionSchema.safeParse({ sessionId: "s1", date: "2026-08-13" }).success).toBe(true);
  });

  it("rejects a malformed date", () => {
    expect(cancelSessionSchema.safeParse({ sessionId: "s1", date: "13/08/2026" }).success).toBe(false);
    expect(cancelSessionSchema.safeParse({ sessionId: "s1", date: "2026-8-13" }).success).toBe(false);
  });

  it("rejects an empty sessionId", () => {
    expect(cancelSessionSchema.safeParse({ sessionId: "", date: "2026-08-13" }).success).toBe(false);
  });
});

describe("moveSessionSchema", () => {
  const base = { sessionId: "s1", date: "2026-08-13", startTime: "10:00", endTime: "11:00" };

  it("accepts valid times with an optional room", () => {
    expect(moveSessionSchema.safeParse(base).success).toBe(true);
    expect(moveSessionSchema.safeParse({ ...base, room: "B2" }).success).toBe(true);
  });

  it("rejects a bad time format", () => {
    expect(moveSessionSchema.safeParse({ ...base, startTime: "10:60" }).success).toBe(false);
    expect(moveSessionSchema.safeParse({ ...base, endTime: "25:00" }).success).toBe(false);
    expect(moveSessionSchema.safeParse({ ...base, startTime: "10am" }).success).toBe(false);
  });

  it("rejects end time not after start time", () => {
    expect(moveSessionSchema.safeParse({ ...base, endTime: "10:00" }).success).toBe(false);
    expect(moveSessionSchema.safeParse({ ...base, endTime: "09:30" }).success).toBe(false);
  });

  it("rejects a malformed date", () => {
    expect(moveSessionSchema.safeParse({ ...base, date: "2026/08/13" }).success).toBe(false);
  });
});
