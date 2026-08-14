import { afterEach, describe, expect, it } from "vitest";
import i18n from "@/lib/i18n";
import { undo } from "@/lib/i18n/en/undo";

const KEYS = Object.keys(undo);

afterEach(async () => {
  await i18n.changeLanguage("ar");
});

describe("undo i18n keys", () => {
  it.each(KEYS)("en resolves undo.%s to a real string", async (key) => {
    await i18n.changeLanguage("en");
    const value = i18n.t(`undo.${key}`);
    expect(value).not.toBe(`undo.${key}`);
  });

  it.each(KEYS)("ar resolves undo.%s to a real string", async (key) => {
    await i18n.changeLanguage("ar");
    const value = i18n.t(`undo.${key}`);
    expect(value).not.toBe(`undo.${key}`);
  });

  it("shows the expected labels in each locale", async () => {
    await i18n.changeLanguage("en");
    expect(i18n.t("undo.deleted")).toBe("Deleted");
    expect(i18n.t("undo.undo")).toBe("Undo");
    await i18n.changeLanguage("ar");
    expect(i18n.t("undo.deleted")).toBe("تم الحذف");
    expect(i18n.t("undo.undo")).toBe("تراجع");
  });
});
