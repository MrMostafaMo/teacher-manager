# Roadmap

Milestone-driven build plan. Each phase must **compile and run** before the
next begins, and ends with a review checkpoint.

| #    | Phase                                    | Status      |
| ---- | ---------------------------------------- | ----------- |
| 0    | Scaffold, deps, Tauri/Tailwind/shadcn, SQLite + Drizzle, RTL | ✅ Done |
| 1    | Layout: sidebar, header, routing, theme + language switchers, dashboard placeholder | ⏳ Next |
| 2    | Full normalized schema (13 tables), migration, repository layer, activity log | pending |
| 3    | Students: CRUD, validation, search, filters, profile, parents | pending |
| 4    | Attendance: daily/monthly, percentage, late | pending |
| 5    | Payments: subscription, paid/remaining/due, history | pending |
| 6    | Homework: assign/submit, completion % | pending |
| 7    | Exams: creation, grades, avg/high/low | pending |
| 8    | Skills, weak points, per-student analytics | pending |
| 9    | Reports: PDF + Excel exports | pending |
| 10   | Dashboard analytics, charts, KPIs | pending |
| 11   | Backup/restore, settings, DB export | pending |
| 12   | Polish: animations, a11y, performance, packaging | pending |

## Phase 0 — completed

- Scaffolded with create-tauri-app (React 19 + TS + Vite 8, pnpm).
- Tailwind v4 + shadcn/ui (radix base, neutral, RTL-enabled) configured.
- Tauri v2 configured: SQL plugin + embedded migrations, capabilities
  (`sql:default`, `sql:allow-execute`), window 1280×800.
- Drizzle pipeline working: `db:generate` → `db:sync` → embedded migration →
  auto-applied on launch. Verified end-to-end (app writes `schema_version`
  and `last_opened_at` into the real SQLite file).
- i18n (Arabic default/RTL, English/LTR) with bundled Inter + IBM Plex Sans
  Arabic fonts, Latin digits in both locales.
- Theme store (light/dark/system) with pre-paint application.
- Smoke screen proves DB connectivity in the running app.
- Docs: README, architecture, roadmap.
