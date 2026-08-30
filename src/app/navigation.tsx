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
  TriangleAlert,
  BarChart3,
  History,
  Settings,
} from "lucide-react";

export const APP_VERSION = "0.9.4";

export interface NavItem {
  /** Route path. */
  to: string;
  /** i18n key for the label. */
  labelKey: string;
  icon: LucideIcon;
  /** Sidebar grouping key. */
  section: NavSectionId;
}

export type NavSectionId = "main" | "finance" | "academic" | "insights" | "system";

export const NAV_SECTIONS: { id: NavSectionId; labelKey: string }[] = [
  { id: "main", labelKey: "nav.sectionMain" },
  { id: "finance", labelKey: "nav.sectionFinance" },
  { id: "academic", labelKey: "nav.sectionAcademic" },
  { id: "insights", labelKey: "nav.sectionInsights" },
  { id: "system", labelKey: "nav.sectionSystem" },
];

export const NAV_ITEMS: NavItem[] = [
  { to: "/", labelKey: "nav.dashboard", icon: LayoutDashboard, section: "main" },
  { to: "/students", labelKey: "nav.students", icon: Users, section: "main" },
  { to: "/attendance", labelKey: "nav.attendance", icon: CalendarCheck, section: "main" },
  { to: "/groups", labelKey: "nav.groups", icon: Users2, section: "main" },
  { to: "/payments", labelKey: "nav.payments", icon: Wallet, section: "finance" },
  { to: "/expenses", labelKey: "nav.expenses", icon: Receipt, section: "finance" },
  { to: "/homework", labelKey: "nav.homework", icon: NotebookPen, section: "academic" },
  { to: "/exams", labelKey: "nav.exams", icon: ClipboardList, section: "academic" },
  { to: "/skills", labelKey: "nav.skills", icon: Target, section: "academic" },
  { to: "/weak-points", labelKey: "nav.weakPoints", icon: TriangleAlert, section: "academic" },
  { to: "/schedule", labelKey: "nav.schedule", icon: CalendarDays, section: "academic" },
  { to: "/reports", labelKey: "nav.reports", icon: BarChart3, section: "insights" },
  { to: "/activity", labelKey: "nav.activity", icon: History, section: "insights" },
  { to: "/settings", labelKey: "nav.settings", icon: Settings, section: "system" },
];
