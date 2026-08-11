import {
  CalendarCheck,
  ClipboardList,
  NotebookPen,
  Plus,
  Receipt,
  Target,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { GlobalDialogId } from "@/lib/dialog-store";

export interface QuickAction {
  id: string;
  labelKey: string;
  icon: LucideIcon;
  /** Opens a global create dialog. */
  dialog?: GlobalDialogId;
  /** Navigates instead (e.g. attendance has no create dialog). */
  to?: string;
}

export const QUICK_ACTIONS: QuickAction[] = [
  { id: "add-student", labelKey: "students.add", icon: UserPlus, dialog: "student" },
  { id: "record-payment", labelKey: "payments.record", icon: Wallet, dialog: "payment" },
  { id: "add-expense", labelKey: "expenses.record", icon: Receipt, dialog: "expense" },
  { id: "add-group", labelKey: "groups.add", icon: Users, dialog: "group" },
  { id: "add-session", labelKey: "schedule.add", icon: Plus, dialog: "schedule" },
  { id: "add-homework", labelKey: "homework.add", icon: NotebookPen, dialog: "homework" },
  { id: "add-exam", labelKey: "exams.add", icon: ClipboardList, dialog: "exam" },
  { id: "add-skill", labelKey: "skills.add", icon: Target, dialog: "skill" },
  { id: "mark-attendance", labelKey: "dashboard.quick.attendance", icon: CalendarCheck, to: "/attendance" },
];
