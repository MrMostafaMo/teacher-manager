import { logActivity } from "@/lib/activity-log";
import { teacherProfileInputSchema } from "../domain";
import { teacherProfileRepo } from "../infrastructure/teacher-profile-repo";

export async function getTeacherProfile(): Promise<{ name: string } | null> {
  try {
    const row = await teacherProfileRepo.get();
    return row ? { name: row.name } : null;
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (msg.includes("no such table")) return null;
    throw error;
  }
}

export async function upsertTeacherProfile(input: unknown): Promise<{ name: string }> {
  const parsed = teacherProfileInputSchema.parse(input);
  const existing = await teacherProfileRepo.get();
  if (existing) {
    await teacherProfileRepo.update("default", { name: parsed.name });
  } else {
    await teacherProfileRepo.insert({ id: "default", name: parsed.name });
  }
  await logActivity({ action: "teacher.update", entityType: "teacher", entityId: "default", details: { name: parsed.name } });
  return { name: parsed.name };
}
