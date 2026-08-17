import { z } from "zod";

/**
 * WhatsApp messaging domain: template purposes, user templates and their
 * variables. Framework-free by design — rendering and defaults live in
 * the application layer.
 */

export const WHATSAPP_PURPOSES = ["general", "homework", "exams", "skills"] as const;
export type WhatsAppPurpose = (typeof WHATSAPP_PURPOSES)[number];

export const WHATSAPP_MAX_LENGTH = 500;
export const WHATSAPP_MAX_NAME = 60;

export const whatsappTemplateTextSchema = z
  .string()
  .trim()
  .pipe(z.string().min(1).max(WHATSAPP_MAX_LENGTH));

export const whatsappTemplateNameSchema = z
  .string()
  .trim()
  .pipe(z.string().min(1).max(WHATSAPP_MAX_NAME));

/** A single user template: built-in defaults and custom ones alike. */
export interface WhatsAppTemplate {
  id: string;
  name: string;
  purpose: WhatsAppPurpose;
  text: string;
}

export const whatsappTemplateSchema = z.object({
  id: z.string().min(1),
  name: whatsappTemplateNameSchema,
  purpose: z.enum(WHATSAPP_PURPOSES),
  text: whatsappTemplateTextSchema,
});

/** Every variable available to any template (all templates see all vars). */
export const WHATSAPP_VARIABLES = [
  "name",
  "guardianName",
  "group",
  "plan",
  "date",
  "homeworkDone",
  "homeworkTotal",
  "homeworkRate",
  "examAverage",
  "examsCount",
  "weakSkills",
  "strongSkills",
  "skillsCount",
] as const;

export type WhatsAppVars = Record<string, string>;
