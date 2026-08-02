export const en = {
  app: {
    name: "Teacher Manager",
    tagline: "Manage your educational center — fully offline.",
    phase: "Phase",
  },
  common: {
    language: "Language",
    theme: "Theme",
    light: "Light",
    dark: "Dark",
    system: "System",
    retry: "Retry",
  },
  db: {
    checking: "Connecting to local database…",
    connected: "Database connected",
    schemaVersion: "Schema version",
    error: "Database unavailable",
  },
  nav: {
    dashboard: "Dashboard",
    students: "Students",
    attendance: "Attendance",
    payments: "Payments",
    homework: "Homework",
    exams: "Exams",
    reports: "Reports",
    settings: "Settings",
  },
} as const;

/** Locale shape — every leaf widened to `string` so translations can differ. */
type DeepString<T> = { [K in keyof T]: T[K] extends string ? string : DeepString<T[K]> };
export type Messages = DeepString<typeof en>;
