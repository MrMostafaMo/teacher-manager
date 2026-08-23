import { z } from "zod";

/**
 * Shared zod input helpers, framework-free by design.
 *
 * The `optional*` helpers normalize blank strings to `undefined` so the DB
 * stores NULL rather than "" for empty optional fields.
 */

export const optionalText = (max: number) =>
  z
    .union([z.literal(""), z.string().trim().pipe(z.string().max(max))])
    .optional()
    .transform((v) => (v ? v : undefined));

export const optionalId = z
  .union([z.literal(""), z.string().min(1)])
  .optional()
  .transform((v) => (v ? v : undefined));

/** "YYYY-MM-DD" date; blank normalizes to undefined (NULL in the DB). */
export const optionalDate = z
  .union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)])
  .optional()
  .transform((v) => (v ? v : undefined));

/** Optional phone; blank → undefined, otherwise digits / + / spaces / - / (). */
export const optionalPhone = z
  .union([z.literal(""), z.string().trim().pipe(z.string().max(20).regex(/^\+?[0-9\s\-()]+$/))])
  .optional()
  .transform((v) => (v ? v : undefined));

/** Money amounts are integers (EGP), entered via number inputs. */
export const amountSchema = z.number().int().positive().max(100_000_000);

/** Non-blank free-text field (trimmed). */
export const textSchema = (max: number) => z.string().trim().pipe(z.string().min(1).max(max));

/** Non-blank name / short title field. */
export const nameSchema = textSchema(100);
