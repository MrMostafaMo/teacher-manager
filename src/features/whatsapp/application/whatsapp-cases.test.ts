import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TFunction } from "i18next";

vi.mock("@/features/whatsapp/infrastructure/template-repo", () => ({
  whatsappTemplateRepo: { list: vi.fn(), saveAll: vi.fn() },
}));

import { whatsappTemplateRepo } from "@/features/whatsapp/infrastructure/template-repo";
import type { WhatsAppTemplate } from "../domain";
import {
  defaultTemplates,
  deleteTemplate,
  listTemplates,
  resetTemplateDefaults,
  upsertTemplate,
} from "./whatsapp-cases";

const mockedList = vi.mocked(whatsappTemplateRepo.list);
const mockedSave = vi.mocked(whatsappTemplateRepo.saveAll);

const t = ((key: string) => key) as TFunction;

const stored: WhatsAppTemplate[] = [
  { id: "general", name: "عام", purpose: "general", text: "أهلاً {name}" },
];

describe("whatsapp-cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("seeds localized defaults on first launch", async () => {
    mockedList.mockResolvedValue(null);
    const rows = await listTemplates(t);
    expect(rows).toHaveLength(4);
    expect(rows[0].name).toBe("whatsapp.purposes.general");
    expect(rows[0].text).toBe("whatsapp.defaults.general");
    expect(mockedSave).toHaveBeenCalledOnce();
  });

  it("localizes legacy purpose-key names", async () => {
    mockedList.mockResolvedValue([
      { id: "general", name: "general", purpose: "general", text: "أهلاً" },
    ]);
    const rows = await listTemplates(t);
    expect(rows[0].name).toBe("whatsapp.purposes.general");
    expect(mockedSave).not.toHaveBeenCalled();
  });

  it("returns stored templates untouched when names are custom", async () => {
    mockedList.mockResolvedValue(stored);
    const rows = await listTemplates(t);
    expect(rows).toEqual(stored);
    expect(mockedSave).not.toHaveBeenCalled();
  });

  it("creates a template with a fresh id", async () => {
    mockedList.mockResolvedValue(stored);
    const created = await upsertTemplate({ name: "جديد", purpose: "exams", text: "نتيجة {examAverage}" }, t);
    expect(created.id).toBeTruthy();
    expect(created.name).toBe("جديد");
    expect(mockedSave.mock.calls[0][0]).toHaveLength(2);
  });

  it("updates an existing template by id", async () => {
    mockedList.mockResolvedValue(stored);
    await upsertTemplate({ id: "general", name: "عام جديد", purpose: "general", text: "نص" }, t);
    const saved = mockedSave.mock.calls[0][0];
    expect(saved).toHaveLength(1);
    expect(saved[0].name).toBe("عام جديد");
  });

  it("rejects an empty template name", async () => {
    mockedList.mockResolvedValue(stored);
    await expect(upsertTemplate({ name: "  ", purpose: "general", text: "نص" }, t)).rejects.toThrow();
  });

  it("deletes a template by id", async () => {
    mockedList.mockResolvedValue([...stored, { id: "x", name: "زائد", purpose: "skills", text: "نص" }]);
    await deleteTemplate("x", t);
    const saved = mockedSave.mock.calls[0][0];
    expect(saved).toHaveLength(1);
    expect(saved[0].id).toBe("general");
  });

  it("keeps the array empty after deleting everything", async () => {
    mockedList.mockResolvedValue(stored);
    await deleteTemplate("general", t);
    expect(mockedSave.mock.calls[0][0]).toEqual([]);
  });

  it("resetTemplateDefaults replaces everything with defaults", async () => {
    await resetTemplateDefaults(t);
    const saved = mockedSave.mock.calls[0][0];
    expect(saved).toHaveLength(4);
    expect(defaultTemplates(t)).toHaveLength(4);
  });
});