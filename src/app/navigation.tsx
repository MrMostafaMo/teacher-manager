import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  Users2,
  CalendarCheck,
  Wallet,
  NotebookPen,
  ClipboardList,
  Target,
  BarChart3,
  Settings,
} from "lucide-react";

export interface NavItem {
  /** Route path. */
  to: string;
  /** i18n key for the label. */
  labelKey: string;
  icon: LucideIcon;
  /** Milestone that fully builds this feature. */
  phase: number;
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/", labelKey: "nav.dashboard", icon: LayoutDashboard, phase: 11 },
  { to: "/students", labelKey: "nav.students", icon: Users, phase: 3 },
  { to: "/attendance", labelKey: "nav.attendance", icon: CalendarCheck, phase: 4 },
  { to: "/groups", labelKey: "nav.groups", icon: Users2, phase: 5 },
  { to: "/payments", labelKey: "nav.payments", icon: Wallet, phase: 6 },
  { to: "/homework", labelKey: "nav.homework", icon: NotebookPen, phase: 7 },
  { to: "/exams", labelKey: "nav.exams", icon: ClipboardList, phase: 8 },
  { to: "/skills", labelKey: "nav.skills", icon: Target, phase: 9 },
  { to: "/reports", labelKey: "nav.reports", icon: BarChart3, phase: 10 },
  { to: "/settings", labelKey: "nav.settings", icon: Settings, phase: 12 },
];
