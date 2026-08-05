# Teacher Manager

A production-quality desktop application for private teachers to manage their
educational center — students, attendance, payments, homework, exams, skills,
reports, and analytics.

**Fully offline.** All data lives in a local SQLite database. No server, no
internet required.

## Tech Stack

| Layer     | Choice                                                       |
| --------- | ------------------------------------------------------------ |
| Desktop   | Tauri v2 (Windows / Linux / macOS)                           |
| Frontend  | React 19 + TypeScript + Vite 8                               |
| UI        | TailwindCSS v4, shadcn/ui, Lucide Icons                      |
| State     | Zustand                                                      |
| Forms     | React Hook Form + Zod                                        |
| Tables    | TanStack Table                                               |
| Charts    | Recharts                                                     |
| Database  | SQLite (via `@tauri-apps/plugin-sql`)                        |
| ORM       | Drizzle ORM (`sqlite-proxy` driver)                          |
| Routing   | React Router                                                 |
| i18n      | react-i18next (Arabic RTL + English LTR)                     |
| Date      | dayjs                                                        |
| Export    | pdf-lib (PDF), xlsx (Excel)                                  |

## Development

```bash
pnpm install          # install dependencies
pnpm tauri dev        # launch the desktop app in dev mode
pnpm build            # typecheck + frontend production build
pnpm tauri build      # build installers (.deb/.rpm/.AppImage on Linux)
```

### Database workflow

Schema lives in `src/lib/db/schema.ts`. When you change it:

```bash
pnpm db:generate      # drizzle-kit: emit SQL into drizzle/
pnpm db:sync          # copy + strip into src-tauri/migrations/
```

Then add the new file to the `MIGRATIONS` list in `src-tauri/src/lib.rs`.
Migrations are embedded in the binary and applied automatically on launch.

## Project Layout

```
src/
├─ app/            # entry point, routes, providers, app shell
├─ components/ui/  # shadcn primitives
├─ features/       # feature modules (students, attendance, payments, …)
├─ shared/         # feature-agnostic UI (PageHeader, DataTable, ConfirmDialog, …)
├─ hooks/          # shared hooks
├─ lib/            # db (schema/repositories), i18n, theme, utils, activity-log…
├─ styles/         # global styles + Tailwind theme
src-tauri/         # Rust shell, embedded migrations, capabilities
drizzle/           # drizzle-kit migration source
scripts/           # migration sync + tooling
docs/              # architecture, roadmap, schema
```

Feature modules follow a light DDD layout:
`domain.ts` (entities + Zod schemas) → `application/` (use cases) →
`infrastructure/` (Drizzle repositories) → `ui/` (React components).
See `docs/architecture.md`.

## Language & Direction

- Default language: **Arabic (RTL)**, switchable to English (LTR).
- Latin digits (0123) in both locales by design.
- Arabic font: IBM Plex Sans Arabic; Latin: Inter — both bundled offline.

## Milestones

See `docs/roadmap.md` for the 15-phase build plan and current status.
