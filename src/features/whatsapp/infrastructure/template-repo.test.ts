import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WhatsAppTemplate } from "../domain";

vi.mock("@/lib/db/app-meta", () => ({
  getMeta: vi.fn(),
  setMeta: vi.fn(),
}));

import { getMeta, setMeta } from "@/lib/db/app-meta";
import { whatsappTemplateRepo } from "./template-repo";

const mockedGet = vi.mocked(getMeta);
const mockedSet = vi.mocked(setMeta);

function template(overrides: Partial<WhatsAppTemplate> = {}): WhatsAppTemplate {
  return {
    id: "t1",
    name: "تذكير",
    purpose: "general",
    text: "مرحبًا {name}",
    ...overrides,
  };
}

describe("whatsappTemplateRepo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when nothing is stored", async () => {
    mockedGet.mockResolvedValue(null);
    expect(await whatsappTemplateRepo.list()).toBeNull();
  });

  it("returns templates from an array blob", async () => {
    mockedGet.mockResolvedValue(JSON.stringify([template()]));
    const rows = await whatsappTemplateRepo.list();
    expect(rows).toHaveLength(1);
    expect(rows?.[0].name).toBe("تذكير");
  });

  it("drops invalid rows from an array blob", async () => {
    mockedGet.mockResolvedValue(
      JSON.stringify([template(), { id: "x", name: "  ", purpose: "general", text: "" }]),
    );
    const rows = await whatsappTemplateRepo.list();
    expect(rows).toHaveLength(1);
  });

  it("migrates the legacy Record<purpose, text> format", async () => {
    mockedGet.mockResolvedValue(JSON.stringify({ general: "أهلاً {name}", homework: "واجب {name}" }));
    const rows = await whatsappTemplateRepo.list();
    expect(rows).toHaveLength(2);
    expect(rows?.[0]).toMatchObject({ id: "general", name: "general", purpose: "general" });
    expect(rows?.[1].text).toBe("واجب {name}");
  });

  it("returns null for corrupted JSON", async () => {
    mockedGet.mockResolvedValue("{nope");
    expect(await whatsappTemplateRepo.list()).toBeNull();
  });

  it("persists the full array", async () => {
    await whatsappTemplateRepo.saveAll([template(), template({ id: "t2", name: "تقرير" })]);
    expect(mockedSet).toHaveBeenCalledWith("wa_templates", JSON.stringify([
      template(),
      template({ id: "t2", name: "تقرير" }),
    ]));
  });
});