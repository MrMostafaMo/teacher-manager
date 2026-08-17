import { describe, expect, it } from "vitest";
import { renderTemplate, templateTokens } from "./template-render";

describe("renderTemplate", () => {
  it("replaces known tokens with values", () => {
    expect(
      renderTemplate("أهلاً {name}، النسبة {homeworkRate}%", { name: "علي", homeworkRate: "80" }),
    ).toBe("أهلاً علي، النسبة 80%");
  });

  it("leaves unknown tokens untouched", () => {
    expect(renderTemplate("مرحبًا {name} {typo}", { name: "سارة" })).toBe("مرحبًا سارة {typo}");
  });

  it("handles a template with no tokens", () => {
    expect(renderTemplate("رسالة ثابتة", {})).toBe("رسالة ثابتة");
  });

  it("replaces repeated tokens everywhere", () => {
    expect(renderTemplate("{name} و {name}", { name: "ليلى" })).toBe("ليلى و ليلى");
  });
});

describe("templateTokens", () => {
  it("returns tokens in order of appearance", () => {
    expect(templateTokens("أهلاً {name} من {group}")).toEqual(["name", "group"]);
  });

  it("returns an empty list when there are no tokens", () => {
    expect(templateTokens("لا متغيرات")).toEqual([]);
  });
});
