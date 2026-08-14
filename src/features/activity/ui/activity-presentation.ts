import {
  AppWindow,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  FileText,
  NotebookPen,
  Receipt,
  Target,
  TriangleAlert,
  User,
  Users2,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { formatMoney } from "@/lib/utils/format";
import type { ActivityLogRow } from "@/lib/activity-log";

/** Entity icon map (display concern — stays in the UI layer). */
export const ENTITY_ICONS: Record<string, LucideIcon> = {
  app: AppWindow,
  student: User,
  payment: Wallet,
  plan: FileText,
  expense: Receipt,
  skill: Target,
  homework: NotebookPen,
  schedule: CalendarDays,
  group: Users2,
  exam: ClipboardList,
  attendance: CalendarCheck,
  weakPoint: TriangleAlert,
};

export function detailsParts(row: ActivityLogRow, names: Map<string, string>): string[] {
  if (!row.details) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(row.details);
  } catch {
    return [];
  }
  if (typeof parsed !== "object" || parsed === null) return [];
  const d = parsed as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof d.name === "string" && d.name) parts.push(d.name);
  if (typeof d.title === "string" && d.title) parts.push(d.title);
  if (typeof d.groupName === "string" && d.groupName) parts.push(d.groupName);
  if (typeof d.studentId === "string") {
    const name = names.get(d.studentId);
    if (name) parts.push(name);
  }
  if (typeof d.amount === "number") parts.push(formatMoney(d.amount));
  if (typeof d.score === "number") parts.push(String(d.score));
  if (typeof d.period === "string" && /^\d{4}-\d{2}$/.test(d.period)) parts.push(d.period);
  return parts;
}
