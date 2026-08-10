import { z } from "zod";
import { nameSchema, optionalText } from "@/lib/validation";

/**
 * Exam entity + input schema. Scores live in `exam_results` and are validated
 * against each exam's `maxScore` in the application layer (the schema here
 * can't know it). A student without a result row simply hasn't taken it yet.
 */
const maxScoreSchema = z
  .union([z.literal(""), z.number(), z.string()])
  .transform((v) => (v === "" ? 100 : Number(v)))
  .pipe(z.number().int().min(1).max(100000));

export const examInputSchema = z.object({
  groupId: z.string().min(1),
  title: nameSchema,
  maxScore: maxScoreSchema,
  date: optionalText(10),
});

/** Raw form shape — strings are coerced by the schema (maxScore, score). */
export type ExamInput = z.input<typeof examInputSchema>;

/** A single student's result for one exam. `score: null` clears the result. */
export const examResultSchema = z.object({
  studentId: z.string().min(1),
  score: z
    .union([z.literal(""), z.number(), z.string()])
    .transform((v) => (v === "" ? null : Number(v)))
    // `Number("abc")` is NaN — the number pipe rejects it so garbage input
    // can never be written as a result row.
    .pipe(z.number().min(0).nullable()),
  note: optionalText(500),
});

/** Raw form shape for one student's result. `score` empty clears the result. */
export type ExamResultInput = z.input<typeof examResultSchema>;
