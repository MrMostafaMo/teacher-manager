import { describe, expect, it } from "vitest";
import { amountSchema, nameSchema, optionalDate, optionalId, optionalText } from "@/lib/validation";

describe("optionalText", () => {
  it("normalizes blank strings to undefined", () => {
    const schema = optionalText(20);
    expect(schema.parse("")).toBeUndefined();
    expect(schema.parse(undefined)).toBeUndefined();
  });

  it("keeps non-blank trimmed values", () => {
    const schema = optionalText(20);
    expect(schema.parse("  hello ")).toBe("hello");
  });

  it("rejects values over the max length", () => {
    const schema = optionalText(3);
    expect(schema.safeParse("toolong").success).toBe(false);
  });
});

describe("optionalId", () => {
  it("normalizes blank to undefined", () => {
    expect(optionalId.parse("")).toBeUndefined();
  });

  it("keeps a valid id", () => {
    expect(optionalId.parse("abc-123")).toBe("abc-123");
  });
});

describe("optionalDate", () => {
  it("accepts YYYY-MM-DD and normalizes blank", () => {
    expect(optionalDate.parse("2026-01-31")).toBe("2026-01-31");
    expect(optionalDate.parse("")).toBeUndefined();
  });

  it("rejects malformed dates", () => {
    expect(optionalDate.safeParse("2026-1-1").success).toBe(false);
    expect(optionalDate.safeParse("31-01-2026").success).toBe(false);
  });
});

describe("amountSchema", () => {
  it("accepts positive integers", () => {
    expect(amountSchema.parse(150)).toBe(150);
  });

  it("rejects non-integers, zero and negatives", () => {
    expect(amountSchema.safeParse(1.5).success).toBe(false);
    expect(amountSchema.safeParse(0).success).toBe(false);
    expect(amountSchema.safeParse(-10).success).toBe(false);
  });

  it("rejects amounts over the cap", () => {
    expect(amountSchema.safeParse(100_000_001).success).toBe(false);
  });
});

describe("nameSchema", () => {
  it("trims and requires a non-blank name", () => {
    expect(nameSchema.parse("  أحمد  ")).toBe("أحمد");
    expect(nameSchema.safeParse("").success).toBe(false);
    expect(nameSchema.safeParse("   ").success).toBe(false);
  });
});
