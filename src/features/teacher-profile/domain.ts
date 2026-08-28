import { z } from "zod";
import { nameSchema } from "@/lib/validation";

export const teacherProfileInputSchema = z.object({
  name: nameSchema,
});

export type TeacherProfileInput = z.infer<typeof teacherProfileInputSchema>;
export type TeacherProfileRow = { id: string; name: string; createdAt: number; updatedAt: number };
