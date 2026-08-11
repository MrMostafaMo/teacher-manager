import type { Homework, StudyGroup } from "@/lib/db/schema";

export interface HomeworkFormState {
  groupId: string;
  title: string;
  description: string;
  dueDate: string;
}

export function emptyHomeworkForm(): HomeworkFormState {
  return { groupId: "", title: "", description: "", dueDate: "" };
}

export function initialHomeworkForm(
  homework: Homework | null,
  groups: StudyGroup[],
  defaultGroupId?: string,
): HomeworkFormState {
  return {
    groupId: homework?.groupId ?? defaultGroupId ?? groups[0]?.id ?? "",
    title: homework?.title ?? "",
    description: homework?.description ?? "",
    dueDate: homework?.dueDate ?? "",
  };
}
