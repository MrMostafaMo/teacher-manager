import { z } from "zod";

/**
 * Homework entity + input schema. Submission rows are created lazily — a
 * student without a row counts as pending, so group membership can change
 * after an assignment without row-sync bugs.
 */

const optionalText = (max: number) =>
  z
    .union([z.literal(""), z.string().trim().pipe(z.string().max(max))])
    .optional()
    .transform((v) => (v ? v : undefined));

export const SUBMISSION_STATUSES = ["pending", "submitted", "late"] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export const submissionStatusSchema = z.enum(SUBMISSION_STATUSES);

export const homeworkInputSchema = z.object({
  groupId: z.string().min(1),
  title: z.string().trim().pipe(z.string().min(1).max(100)),
  description: optionalText(2000),
  dueDate: optionalText(10),
});

export type HomeworkInput = z.infer<typeof homeworkInputSchema>;
