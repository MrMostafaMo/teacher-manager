# AGENTS.md — Teacher Manager

Desktop app (Tauri v2 + React 19 + TypeScript + Vite) for private teachers to
manage an educational center: students, attendance, payments, homework, exams,
skills, reports, and analytics. **Fully offline** — all data lives in a local
SQLite database. No server, no internet required.

Default language is **Arabic (RTL)**, switchable to English (LTR). Latin digits
(0123) in both locales by design.

## Commands

| Command                    | Purpose                                                       |
| -------------------------- | ------------------------------------------------------------- |
| `pnpm dev`                 | Vite dev server (frontend only)                               |
| `pnpm tauri dev`           | Desktop app in dev mode (full stack)                          |
| `pnpm build`               | `tsc --noEmit` + `vite build` — run this before committing    |
| `pnpm tauri build`         | Build installers (.deb/.rpm/.AppImage on Linux)               |
| `pnpm db:generate`         | drizzle-kit emits SQL into `drizzle/` after schema changes    |
| `pnpm db:sync`             | Copies + strips migrations into `src-tauri/migrations/`       |

There is **no test framework**. Verification is done by hand in the real Tauri
window (see Verification below).

## Database Workflow (important)

1. Edit `src/lib/db/schema.ts` — the single source of truth for the schema.
2. `pnpm db:generate && pnpm db:sync`.
3. Add a new `Migration { version: N+1, description, sql }` entry to the
   `migrations()` list in `src-tauri/src/lib.rs`.
4. Migrations are embedded in the binary and applied automatically on launch.

Live DB location (Linux): `~/.config/com.teachermanager.app/teacher-manager.db`.

## Architecture

Each feature lives under `src/features/<feature>/`:

| Path              | Contents                                                     |
| ----------------- | ------------------------------------------------------------ |
| `domain.ts`       | Drizzle entity types + Zod schemas (framework-free, no React) |
| `application/`    | Pure use-case functions; validate input, apply rules, call repo interfaces, write activity log |
| `infrastructure/` | Concrete Drizzle repository implementing the feature's repo interface |
| `ui/`             | React components, forms, TanStack tables                     |

Cross-cutting concerns (activity log, i18n, theme, backup) live under
`src/lib/` and are consumed by feature use-cases.

Other top-level dirs: `src/app/` (entry, routes, providers, app shell),
`src/components/ui/` (shadcn primitives), `src/shared/` (feature-agnostic UI:
PageHeader, DataTable, ConfirmDialog, AppearanceControls…),
`src/lib/db/` (schema, repository, client), `src/styles/` (Tailwind theme).

## Conventions

- **i18n**: every user-facing string is translated. Files under
  `src/lib/i18n/` (e.g. `settings.*`, `common.*`, feature namespaces), one
  file per language. Use `useTranslation()`; never hardcode UI text.
- **RTL**: direction comes from the theme/`dir` attribute; do not hardcode
  `dir` in markup.
- **Styling**: shadcn/ui + Tailwind CSS v4 + `tw-animate-css` (already
  imported in `globals.css`). Respect `prefers-reduced-motion`.
- **Timestamps**: `created_at`/`updated_at` are unix-ms, set by repositories
  (not by callers).
- **Icon-only buttons**: must have `aria-label` or `sr-only`.
- **State**: Zustand stores for UI state; repositories for persistence.
- **Forms**: React Hook Form + Zod resolvers.

## Gotchas

- Drizzle runs through the **`sqlite-proxy` driver** (`src/lib/db/client.ts`).
  The Tauri SQL plugin returns rows as column objects; the proxy converts them
  to positional value arrays (`mapResultRow` reads `row[columnIndex]`).
  Do not change this wiring.
- All queries go through Drizzle query builders — no raw SQL.
- The SQL plugin owns the SQLite file and executes every statement in Rust
  with parameterized binds — no SQL injection surface.
- Editing `src-tauri/capabilities/default.json` requires a full Tauri rebuild
  (~2–4 min). `$HOME/**` does NOT match hidden dirs (`~/.config/…`) — add
  explicit `$APPCONFIG/**` globs for app config paths.
- theme/language persist in WebKit localStorage:
  `~/.local/share/com.teachermanager.app/localstorage/…`
- DB backup uses `VACUUM INTO` (the `.db` file alone is safe to copy; stale
  `-wal`/`-shm` sidecars get removed after restore).
- No TODO/FIXME in the repo. Deliberate simplifications are marked with a
  `ponytail:` comment.

## Verification (E2E flow)

Dev app runs via `pnpm tauri dev`. To drive the real window from the CLI:

- Helpers in `/tmp/opencode/`: `a11y_click.py` (click by role+name),
  `a11y_v3.py` / `a11y_text.py` (accessibility tree dump),
  `a11y_dump_text.py`.
- GTK file dialog: Ctrl+L to type a path.
- Static check before commit: `pnpm build` (tsc + vite).

## Status

Phases 1–14 complete (roadmap: `docs/roadmap.md`). Phase 13 delivered polish
(modal animation + reduced-motion, a11y labels, font subset trimming, CSP,
and Linux installers: .deb/.rpm/.AppImage). Phase 14 added the weekly
timetable: recurring `group_sessions` per day+time, `/schedule` page with a
7-day grid, a "today's sessions" card on the dashboard, per-session
attendance sheets (`session_attendance`, one row per member per occurrence),
and timetable polish (member counts, room-conflict detection, day/group
view toggle).
