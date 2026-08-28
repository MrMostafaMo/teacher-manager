import { createRepository } from "@/lib/db/repository";
import { teacherProfile } from "@/lib/db/tables-teacher-profile";

export const teacherProfileRepo = {
  ...createRepository(teacherProfile),
  async get(): Promise<{ id: string; name: string } | undefined> {
    return this.findById("default") as Promise<{ id: string; name: string } | undefined>;
  },
};
