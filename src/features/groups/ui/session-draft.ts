export const DAYS = [0, 1, 2, 3, 4, 5, 6] as const;
export const DAY_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export interface SessionDraft {
  key: string;
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string;
}

export const emptyDraft = { dayOfWeek: 0, startTime: "", endTime: "", room: "" };
