# Architecture

This document records the architectural decisions of Teacher Manager. It is
updated as features land.

## Principles

- **Clean architecture / SOLID** — UI, application logic and persistence are
  separated and depend on interfaces, not implementations.
- **Feature-based modularity** — each feature is independently maintainable
  and testable.
- **DDD where appropriate** — domain types and business rules live apart from
  framework code.
- **Offline first** — no network dependency at runtime; fonts, assets and data
  are all local.

## Layering

```
┌────────────────────────────────────────────────────────┐
│ ui/         React components, forms, tables             │
├────────────────────────────────────────────────────────┤
│ application/  use cases / services (business rules)     │
├────────────────────────────────────────────────────────┤
│ domain/      entities, Zod schemas, value objects       │
├────────────────────────────────────────────────────────┤
│ infrastructure/  Drizzle repositories (implementations) │
├────────────────────────────────────────────────────────┤
│ db/          client.ts (proxy driver) + migrations      │
└────────────────────────────────────────────────────────┘
```

Feature module convention (`src/features/<feature>/`):

| Path              | Contents                                                     |
| ----------------- | ------------------------------------------------------------ |
| `domain.ts`       | Drizzle entity types + Zod schemas (framework-free, no React) |
| `application/`    | Pure use-case functions; validate input, apply rules, call repo interfaces, write activity log |
| `infrastructure/` | Concrete Drizzle repository implementing the feature's repository interface |
| `ui/`             | React components, forms, TanStack tables                     |

Cross-cutting concerns (activity log, i18n, theme, backup) live under
`src/lib/` and are consumed by feature use-cases.

## Database

### Connectivity

- The Tauri **SQL plugin** (`@tauri-apps/plugin-sql`) owns the SQLite file
  (`sqlite:teacher-manager.db`) and executes every statement in Rust with
  parameterized binds — **no SQL injection surface** (queries are also built
  exclusively through Drizzle query builders).
- Drizzle runs in the frontend through the **`sqlite-proxy` driver**
  (`src/lib/db/client.ts`), mapping `run|all|values|get` to the plugin's
  `execute`/`select`. The plugin returns rows as column objects; the proxy
  converts them to **positional value arrays** (Drizzle's `mapResultRow` reads
  `row[columnIndex]`) — returning objects silently emptied every `get`/`all`
  and broke inserts.

### Persistence layer

- `src/lib/db/schema.ts` — single source of truth; Drizzle tables + exported
  types. `drizzle-kit generate` produces migrations from it.
- `src/lib/db/repository.ts` — generic CRUD (`findById/list/count/insert/
  update/remove`), one thin typed wrapper per table; application use-cases
  depend on it, never raw SQL. All timestamps (`created_at`/`updated_at`)
  are set by repositories as unix-ms.
- `src/lib/activity-log.ts` — audit trail. Every mutation use-case calls
  `logActivity({ action, entityType, entityId?, details? })`; the service
  swallows failures so logging never breaks a write. `listRecentActivity`
  returns newest-first.

### Feature pattern (Phase 3–4: students, attendance)

- `students/domain.ts` exports a Zod `studentInputSchema`; optional fields
  go through `optionalText` (blank → `undefined`) so empty inputs never
  persist as empty strings.
- `students/infrastructure/student-repo.ts` builds a typed repository from
  the generic CRUD and adds `search({ query, status })` — `like` on
  name/phone/guardianName plus an optional `eq(status)`; results ordered by
  name. Search filters compose into a single Drizzle `where`.
- `students/application/student-cases.ts` owns mutations: parse with the
  schema, write through the repository, and `logActivity` the outcome
  (`student.create` carries `{ name }` details; deletes log the id only).
- `students/ui/` renders the list (search + status filter + count badge +
  loading/empty/no-results states) and two native-`<dialog>` modals — an
  add/edit form with per-field Zod errors and a read-only profile with a
  two-step delete confirmation. Error strings are i18n keys, never raw
  exceptions.
- `attendance/` follows the same split (domain → repository → cases → UI).
  The daily save persists **one row per student** for the date (present
  included) so the monthly view counts a saved day exactly once per student;
  `attendance.save` activity carries full-day counts.
- **Drizzle proxy pitfall:** `drizzle-orm/sqlite-proxy` 0.45 maps an empty
  `get()` result to `{}`, not `undefined` — existence checks then see a
  phantom row. `src/lib/db/client.ts` returns a falsy `rows` for empty
  `get()` results, which is the single fix point for `findById`,
  `byStudentAndDate`, `getMeta`, and `count`.

### Feature pattern (Phase 5: study groups)

- `groups/` mirrors the students split (domain → repository → cases → UI).
  `study_groups` and the `student_groups` join table predate the feature
  (migration 0001), so no schema change was needed.
- `group-repo.ts` adds the many-to-many queries: `members`/`nonMembers`
  (active students not yet in a group), `addMember`, `removeMember`, and
  `clearMembers`. SQLite FKs are off in the Rust plugin, so `ON DELETE
  CASCADE` never fires — `deleteGroup` calls `clearMembers` before `remove`.
- **Drizzle proxy pitfall #2:** `select().innerJoin(...)` through the proxy
  driver auto-splits joined rows into `{ table: {...} }` shapes that arrive
  mis-mapped (the join table's columns leaked into the students object). Fix:
  select the joined table's columns explicitly with a `{ id, name, ... }`
  object instead of `select()` with no columns — same for any future join.
- The daily attendance sheet accepts an optional `groupId`; the case
  resolves students via `groupRepository.members(groupId)` when set, so the
  sheet doubles as a group register.

### Feature pattern (Phase 6: payments)

- `payments/` follows the same split. Two tables share the feature: `plans`
  (name, integer amount in EGP, billing interval) and `payments`
  (studentId, optional planId, amount, `period` as YYYY-MM, method, paidAt).
- **Subscription model:** a student's current plan lives on the student row
  (`students.plan_id` → `plans.id`, added in migration 0003). `plans` had to
  move above `students` in `schema.ts` — drizzle resolves FK thunks eagerly
  at table build, so forward references hit a TDZ error.
- Because the SQL plugin runs with `PRAGMA foreign_keys` off, no cascade or
  `ON DELETE SET NULL` ever fires: `deletePlan` first nulls every affected
  `students.plan_id` via `studentRepository.clearPlan`, then removes the row.
- `monthlyDues(period)` is computed in the application layer from three
  parallel reads (active students, plans, that period's payments), summed
  in JS — due = the student's plan amount, paid = sum of period payments,
  remaining = due − paid. No SQL joins; student/plan names in the history
  view are resolved the same way (avoids the proxy join pitfall entirely).
- Selects with an empty value (blank `<option value="">`) normalize to
  `undefined` through an `optionalId` transform, matching `optionalText`.
- The dues table and payment history live in one page with two tabs; a
  `reloadKey` bumped on every mutation refreshes both.

### Initialization

1. `drizzle-kit generate` emits SQL from `src/lib/db/schema.ts` into `drizzle/`.
2. `scripts/sync-migrations.mjs` copies them into `src-tauri/migrations/`
   (stripping drizzle-kit breakpoint comments).
3. The files are embedded with `include_str!` and registered via the plugin's
   `add_migrations` in `src-tauri/src/lib.rs`.
4. On first launch the plugin applies pending migrations automatically —
   **the database self-initializes**, tracked in `_sqlx_migrations`.

### Conventions

- Every table: `id` TEXT UUID PK, `created_at` / `updated_at` INTEGER unix-ms.
- Timestamps are set by repositories (the SQL plugin cannot use
  `CURRENT_TIMESTAMP` in prepared statements).
- UUIDs are v4 strings generated in the application layer.

## Security

- Parameterized queries only (plugin + Drizzle).
- Zod validation at every trust boundary (form input, use-case arguments).
- Tauri **capabilities** restrict IPC: the frontend is granted
  `sql:default` + `sql:allow-execute`; dialog/fs are scoped per feature.
  `fs` scopes include `$APPCONFIG/**` (the live DB lives in a hidden
  `~/.config` dir that `$HOME/**` globs do not match).
- **CSP** (set in `tauri.conf.json`) is strict: `default-src 'self'`,
  `connect-src ipc: http://ipc.localhost`, `style-src 'unsafe-inline' 'self'`
  (inline width/color styles are used in progress bars/charts),
  `font-src 'self' data:`, `img-src 'self' data:`, `script-src 'self'`.

## Arabic / RTL

- `html[dir]`/`html[lang]` derive from the persisted language
  (`src/lib/i18n/language-store.ts`), applied pre-paint in `index.html` and
  `main.tsx` (no flash).
- All layout uses **logical CSS properties** (`ms-`, `me-`, `ps-`, `pe-`,
  `text-start/end`) so every component mirrors under RTL automatically.
- Numbers force `numberingSystem: "latn"` in both locales
  (`src/lib/utils/format.ts`).

## Settings, backup & polish (Phases 12–13)

- `src/features/settings/`:
  - `infrastructure/backup-service.ts` — `liveDbPath()`, `liveDbSize()`,
    `backupDatabase(dest)` via `VACUUM INTO` (consistent snapshot of a live
    WAL db in one statement).
  - `application/settings-cases.ts` — `createBackup()` (native save dialog)
    and `restoreFromBackup()` (open dialog → validate SQLite magic →
    confirm → close pool → copy over live db → remove stale `-wal`/`-shm` →
    reopen + sanity check → reload).
  - `ui/SettingsPage.tsx` — Appearance card (language/theme rows via
    `src/shared/AppearanceControls.tsx`) + Data card (db path, size,
    backup/restore buttons).
- Error boundary active at the root (`src/shared/ErrorBoundary.tsx`) plus a
  router `errorElement`; the SQL plugin applies embedded migrations on launch.
- Polish: modal enter animation via `tw-animate-css` (`open:animate-in`) with
  a global `prefers-reduced-motion` guard; fonts trimmed to used subsets
  (Inter latin, IBM Plex Sans Arabic arabic); release builds produce
  `.deb`/`.rpm`/`.AppImage` (AppImage requires `NO_STRIP=1` — linuxdeploy's
  strip chokes on `.relr.dyn` in modern system libs).

## Weekly timetable (Phase 14)

- `group_sessions` table: recurring weekly sessions, `dayOfWeek` 0–6
  (Sunday-first, matching `Date#getDay()`), "HH:mm" text times, optional
  `room`; unique `(groupId, dayOfWeek, startTime)` prevents double-booking a
  group into the same slot.
- `src/features/schedule/`: `domain.ts` (zod, end-after-start), `application/
  schedule-cases.ts`, `infrastructure/schedule-repo.ts` (`listAll` joins the
  group name/status; `clearForGroup` runs on group delete since FKs are off).
- `ui/SchedulePage.tsx`: 7-column grid (one per day), today's column gets a
  ring highlight; session cards offer edit + two-click-confirm delete.
  `ScheduleFormDialog.tsx` reuses `Modal`; time pickers are native
  `input type="time"`.
- Dashboard reads the same `listSchedule()` data for its "Today's sessions"
  card (active groups only), so it can't disagree with the schedule page.

## Per-group sections (Phase 15)

- `src/shared/CollapsibleSection.tsx` — a Card with a collapsible header:
  chevron toggle button (aria-labelled `common.expand`/`common.collapse`) +
  title + `meta` + `actions`. Collapse state is owned by the caller
  (`useState<Record<string, boolean>>`), in-memory only.
- Homework, exams and payments (dues + history) render one section per group.
  A student in several groups appears in each of their sections; the global
  dues/history totals count unique students only. Students with no group land
  in a trailing "No group" section. Payments fetch the student→groups map via
  `groupRepository.memberships()` (`listMemberships()` in group-cases).
- `GroupFormDialog` edits the timetable directly: day + start/end + room rows
  validated by `groupSessionInputSchema`, written to `group_sessions` through
  the schedule use-cases (`createSession` for new rows, `deleteSession` for
  removed ones). The free-text `study_groups.schedule` column is legacy — no
  longer edited, but still the display fallback for groups with no sessions.
- The groups list and detail dialog render the timetable from
  `group_sessions` instead of the legacy text column.

## Expenses (Phase 16)

- `expenses` table (migration v7): `title`, fixed `category` enum
  (`prizes`/`stationery`/`utilities`/`maintenance`/`other`), `amount`,
  optional `note`, `spentAt` (unix-ms). No student linking by design.
- `src/features/expenses/`: `expense-repo.ts` adds a `byMonth(period)` range
  query on `spentAt` over the generic CRUD; `expense-cases.ts` exposes
  `recordExpense`/`deleteExpense`/`listExpenses`/`monthlyExpenseTotal`, all
  mutations activity-logged.
- `ExpensesPage` mirrors the payments month selector + total badge; deletes
  use the two-click confirm pattern. `RecordExpenseDialog` converts a native
  `input type="date"` value to unix-ms via dayjs.
- The dashboard calls `monthlyExpenseTotal(currentMonth)` alongside
  `monthlyDues` and exposes `expensesMonth` + `net` (collected − expenses)
  as the 7th/8th KPI cards (`md:grid-cols-4`).

## Expense reports (Phase 17)

- Report keys in `reports/domain.ts` now include `expenses` and `finances`;
  `buildReportData` dispatches to the new builders in `report-cases.ts`.
- `expensesReport`: flat table over `expenses` (date, title, localized
  category via the new `ReportTranslations.category` callback, amount, note).
- `financesReport`: aggregates `payments` by their `period` column and
  `expenses` by the dayjs month of `spentAt`, then emits one row per month
  (collected / expenses / net), ascending.
- Exporters are untouched — both consume the shared `ReportData` shape.
