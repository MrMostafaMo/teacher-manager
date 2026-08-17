import { getMeta, setMeta } from "@/lib/db/app-meta";
import { whatsappTemplateSchema, type WhatsAppTemplate } from "../domain";

/**
 * WhatsApp template repository: user templates persisted in the DB
 * `app_meta` key-value store (single JSON array) so they survive
 * backup/restore. `null` means "never configured" (seeded by the case
 * layer); an empty array means the user deleted every template on purpose.
 */

const STORE_KEY = "wa_templates";

export interface WhatsAppTemplateRepo {
  list(): Promise<WhatsAppTemplate[] | null>;
  saveAll(templates: WhatsAppTemplate[]): Promise<void>;
}

function parseTemplates(raw: string): WhatsAppTemplate[] | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return legacyToTemplates(parsed);
    return parsed
      .filter((row): row is WhatsAppTemplate => whatsappTemplateSchema.safeParse(row).success)
      .map((row) => ({
        ...row,
        name: row.name.trim(),
        text: row.text.trim(),
      }));
  } catch {
    return null;
  }
}

/** Pre-array format: `Record<purpose, text>` → one template per purpose. */
function legacyToTemplates(record: unknown): WhatsAppTemplate[] {
  if (typeof record !== "object" || record === null) return [];
  const rows: Array<{ id: string; name: string; purpose: string; text: string }> = Object.entries(
    record as Record<string, unknown>,
  ).map(([purpose, text]) => ({
    id: purpose,
    name: purpose,
    purpose,
    text: typeof text === "string" ? text : "",
  }));
  return rows.filter(
    (row): row is WhatsAppTemplate => whatsappTemplateSchema.safeParse(row).success,
  );
}

export const whatsappTemplateRepo: WhatsAppTemplateRepo = {
  async list() {
    const raw = await getMeta(STORE_KEY);
    if (!raw) return null;
    return parseTemplates(raw);
  },

  async saveAll(templates) {
    await setMeta(STORE_KEY, JSON.stringify(templates));
  },
};
