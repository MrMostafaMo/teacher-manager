import { z } from "zod";
import { nameSchema, optionalText } from "@/lib/validation";

/**
 * Homework entity + input schema. Submission rows are created lazily — a
 * student without a row counts as pending, so group membership can change
 * after an assignment without row-sync bugs.
 */
export const SUBMISSION_STATUSES = ["pending", "submitted", "late"] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export const submissionStatusSchema = z.enum(SUBMISSION_STATUSES);

export const homeworkInputSchema = z.object({
  groupId: z.string().min(1),
  title: nameSchema,
  description: optionalText(2000),
  dueDate: optionalText(10),
});

export type HomeworkInput = z.infer<typeof homeworkInputSchema>;
