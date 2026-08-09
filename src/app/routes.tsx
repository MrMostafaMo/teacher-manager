import { createBrowserRouter } from "react-router";
import { AppLayout } from "@/app/layouts/AppLayout";
import { RouteErrorPage } from "@/app/RouteErrorPage";

// Static specifiers keep Vite's code splitting working per feature.
export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        index: true,
        lazy: async () => ({
          Component: (await import("@/features/dashboard/ui/DashboardPage")).default,
        }),
      },
      {
        path: "students",
        lazy: async () => ({
          Component: (await import("@/features/students/ui/StudentsPage")).default,
        }),
      },
      {
        path: "students/:id",
        lazy: async () => ({
          Component: (await import("@/features/student-profile/ui/StudentProfilePage")).default,
        }),
      },
      {
        path: "attendance",
        lazy: async () => ({
          Component: (await import("@/features/attendance/ui/AttendancePage")).default,
        }),
      },
      {
        path: "groups",
        lazy: async () => ({
          Component: (await import("@/features/groups/ui/GroupsPage")).default,
        }),
      },
      {
        path: "payments",
        lazy: async () => ({
          Component: (await import("@/features/payments/ui/PaymentsPage")).default,
        }),
      },
      {
        path: "expenses",
        lazy: async () => ({
          Component: (await import("@/features/expenses/ui/ExpensesPage")).default,
        }),
      },
      {
        path: "homework",
        lazy: async () => ({
          Component: (await import("@/features/homework/ui/HomeworkPage")).default,
        }),
      },
      {
        path: "exams",
        lazy: async () => ({
          Component: (await import("@/features/exams/ui/ExamsPage")).default,
        }),
      },
      {
        path: "skills",
        lazy: async () => ({
          Component: (await import("@/features/skills/ui/SkillsPage")).default,
        }),
      },
      {
        path: "schedule",
        lazy: async () => ({
          Component: (await import("@/features/schedule/ui/SchedulePage")).default,
        }),
      },
      {
        path: "reports",
        lazy: async () => ({
          Component: (await import("@/features/reports/ui/ReportsPage")).default,
        }),
      },
      {
        path: "activity",
        lazy: async () => ({
          Component: (await import("@/features/activity/ui/ActivityPage")).default,
        }),
      },
      {
        path: "settings",
        lazy: async () => ({
          Component: (await import("@/features/settings/ui/SettingsPage")).default,
        }),
      },
    ],
  },
]);
