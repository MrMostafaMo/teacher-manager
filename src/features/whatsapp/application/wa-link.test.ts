import { describe, expect, it } from "vitest";
import { buildWhatsAppLink, normalizePhone } from "./wa-link";

describe("buildWhatsAppLink", () => {
  it("strips non-digits from the phone", () => {
    expect(buildWhatsAppLink("+20 100 123-4567", "أهلاً")).toBe(
      "https://wa.me/201001234567?text=%D8%A3%D9%87%D9%84%D8%A7%D9%8B",
    );
  });

  it("encodes the message", () => {
    const link = buildWhatsAppLink("0100123", "مرحبًا {name}!");
    expect(link).toContain("?text=");
    expect(link).toContain("name");
    expect(decodeURIComponent(link ?? "")).toBe(
      "https://wa.me/0100123?text=مرحبًا {name}!",
    );
  });

  it("returns null when no digits remain", () => {
    expect(buildWhatsAppLink("() -", "رسالة")).toBeNull();
    expect(buildWhatsAppLink("", "رسالة")).toBeNull();
  });
});

describe("normalizePhone", () => {
  it("keeps digits and plus only", () => {
    expect(normalizePhone("+20 100 12-34")).toBe("+201001234");
  });
});