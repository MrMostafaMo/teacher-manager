import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  Users2,
  CalendarCheck,
  CalendarDays,
  Wallet,
  Receipt,
  NotebookPen,
  ClipboardList,
  Target,
  BarChart3,
  Settings,
} from "lucide-react";

export const APP_VERSION = "0.1.2";

export interface NavItem {
  /** Route path. */
  to: string;
  /** i18n key for the label. */
  labelKey: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { to: "/students", labelKey: "nav.students", icon: Users },
  { to: "/attendance", labelKey: "nav.attendance", icon: CalendarCheck },
  { to: "/groups", labelKey: "nav.groups", icon: Users2 },
  { to: "/payments", labelKey: "nav.payments", icon: Wallet },
  { to: "/expenses", labelKey: "nav.expenses", icon: Receipt },
  { to: "/homework", labelKey: "nav.homework", icon: NotebookPen },
  { to: "/exams", labelKey: "nav.exams", icon: ClipboardList },
  { to: "/skills", labelKey: "nav.skills", icon: Target },
  { to: "/schedule", labelKey: "nav.schedule", icon: CalendarDays },
  { to: "/reports", labelKey: "nav.reports", icon: BarChart3 },
  { to: "/settings", labelKey: "nav.settings", icon: Settings },
];
