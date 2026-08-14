import type { TFunction } from "i18next";
import { whatsappTemplateRepo } from "@/features/whatsapp/infrastructure/template-repo";
import { uuid } from "@/lib/utils/uuid";
import {
  WHATSAPP_PURPOSES,
  whatsappTemplateSchema,
  type WhatsAppPurpose,
  type WhatsAppTemplate,
} from "../domain";

/** Localized default templates: one per purpose. */
export function defaultTemplates(t: TFunction): WhatsAppTemplate[] {
  return WHATSAPP_PURPOSES.map((purpose) => ({
    id: purpose,
    name: t(`whatsapp.purposes.${purpose}`),
    purpose,
    text: t(`whatsapp.defaults.${purpose}`),
  }));
}

/** Localize names that are still raw purpose keys (legacy rows). */
function localizeLegacyNames(
  templates: WhatsAppTemplate[],
  t: TFunction,
): WhatsAppTemplate[] {
  return templates.map((template) => {
    const isKey = WHATSAPP_PURPOSES.includes(template.name as WhatsAppPurpose);
    return isKey ? { ...template, name: t(`whatsapp.purposes.${template.name}`) } : template;
  });
}

/** All templates; seeds the localized defaults on first launch. */
export async function listTemplates(t: TFunction): Promise<WhatsAppTemplate[]> {
  const stored = await whatsappTemplateRepo.list();
  if (stored === null) {
    const defaults = defaultTemplates(t);
    await whatsappTemplateRepo.saveAll(defaults);
    return defaults;
  }
  return localizeLegacyNames(stored, t);
}

export interface TemplateInput {
  id?: string;
  name: string;
  purpose: WhatsAppPurpose;
  text: string;
}

/** Create or update a template (empty id = create). */
export async function upsertTemplate(
  input: TemplateInput,
  t: TFunction,
): Promise<WhatsAppTemplate> {
  const templates = await listTemplates(t);
  const id = input.id?.trim() ? input.id : uuid();
  const parsed = whatsappTemplateSchema.parse({ id, ...input });
  const exists = templates.some((row) => row.id === id);
  const next = exists
    ? templates.map((row) => (row.id === id ? parsed : row))
    : [...templates, parsed];
  await whatsappTemplateRepo.saveAll(next);
  return parsed;
}

/** Delete a template by id (keeps the array, so defaults do not re-seed). */
export async function deleteTemplate(id: string, t: TFunction): Promise<void> {
  const templates = await listTemplates(t);
  await whatsappTemplateRepo.saveAll(templates.filter((row) => row.id !== id));
}

/** Replace all templates with the four localized defaults. */
export async function resetTemplateDefaults(t: TFunction): Promise<void> {
  await whatsappTemplateRepo.saveAll(defaultTemplates(t));
}