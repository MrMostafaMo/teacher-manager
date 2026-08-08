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
PageHeader, DataTable, ConfirmDialog, AppearanceControls, CollapsibleSection…),
`src/lib/db/` (schema, repository, client), `src/styles/` (Tailwind theme).

`CollapsibleSection` (`src/shared/CollapsibleSection.tsx`) is a Card with a
collapsible header (chevron button + title + `meta` + `actions`). Collapse
state is owned by the caller (`useState<Record<string, boolean>>`, in-memory
only). It is used to group per-group lists in homework, exams, and payments.

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
- **Date/time display**: display dates as `DD-MM-YYYY`; keep native date/month
  input values and stored date keys as ISO (`YYYY-MM-DD` / `YYYY-MM`). Session
  times are stored as 24h `HH:mm` but displayed via `formatTime()` and the
  persisted `tm-time` setting.
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

- Helpers in `/tmp/opencode/` (recreate after `/tmp` is wiped — keep them out
  of git): `click.py` (prints screen coords for role+name+idx),
  `dump.py` / `dumpall.py` (accessibility tree dump; `dumpall` shows raw
  text on every node). Combine with `xdotool mousemove … click 1`.
- **Modal quirk**: xdotool clicks/keys reach page buttons (nav, tabs, table
  rows, collapse toggles) but NOT buttons inside native `<dialog>` modals — a
  WebKitGTK automation limitation, not a product bug. Verify modal-heavy flows
  by seeding the SQLite DB directly and re-navigating the page. The custom
  date/month picker popovers (`src/shared/DatePicker.tsx`) have the same
  quirk: their internals aren't clickable via xdotool. Verify picker logic in
  a real browser against the vite dev server (e.g. playwright + chromium),
  or by seeding data.
- GTK file dialog: Ctrl+L to type a path.
- Static check before commit: `pnpm build` (tsc + vite).

## Status

Phases 1–14 complete (roadmap: `docs/roadmap.md`). Phase 13 delivered polish
(modal animation + reduced-motion, a11y labels, font subset trimming, CSP,
and Linux installers: .deb/.rpm/.AppImage). Phase 14 added the weekly
timetable: recurring `group_sessions` per day+time, `/schedule` page with a
7-day grid, a "today's sessions" card on the dashboard, per-session
attendance sheets (`session_attendance`, one row per member per occurrence),
timetable polish (member counts, room-conflict detection, day/group
view toggle), and separate session-attendance monthly statistics in the
attendance report.

Phase 15 grouped per-group lists behind `CollapsibleSection` and made the
group form's "schedule" field a live timetable editor. Specifically:

- Homework, exams, and payments (both dues and history) render one
  collapsible section per group; a student in several groups appears in each
  of their sections, while global totals in payments count unique students
  only. Students with no group land in a trailing "No group" section.
- The group form (create/edit) now edits recurring sessions directly: day +
  start/end + room rows that write to `group_sessions` via the schedule
  use-cases (`createSession`/`deleteSession`/`listSchedule`). The free-text
  `study_groups.schedule` column is legacy — no longer edited, but still the
  display fallback for groups with no sessions.
- Group list + detail dialogs render the timetable from `group_sessions`;
  `group-repo.memberships()` / `listMemberships()` feed the payments grouping.

Phase 16 added expense tracking (المصروفات — money *out*: prizes,
stationery, utilities, maintenance):

- New `expenses` table (migration v7): `title`, fixed `category` enum
  (`prizes`/`stationery`/`utilities`/`maintenance`/`other`), `amount`,
  optional `note`, `spentAt` (unix-ms) — no student linking by design.
- `src/features/expenses/` follows the standard feature split (domain/
  application/infrastructure/ui). `ExpensesPage` has a month selector + a
  per-month total badge, a table of that month's expenses (date, title,
  category badge, amount, two-click-confirm delete), and a `RecordExpenseDialog`
  (native `input type="date"` → unix-ms `spentAt`).
- Dashboard gains two KPIs: `expensesMonth` and `net` (collected − expenses);
  the KPI grid is now `md:grid-cols-4` (8 cards). KPI card count is 8.

Phase 17 added two report types in `src/features/reports/` (no exporter
changes — Excel/PDF are generic over `ReportData`):

- `expenses`: flat table over the `expenses` table — date, title, localized
  category name, amount, note — newest first. `ReportTranslations` gains an
  optional `category` translate callback for the localized category labels.
- `finances`: per-month financial summary — collected from `payments.period`,
  expenses from `expenses.spentAt` (dayjs month), net = collected − expenses.
- Report keys now: students, attendance, exams, payments, expenses, finances,
  skills.

Phase 19 added editing for the last two create-only features:

- `updatePayment` / `updateExpense` use-cases (same Zod schemas as create,
  generic repo `update`, activity-logged). `RecordPaymentDialog` and
  `RecordExpenseDialog` accept an optional row prop for edit mode: prefilled
  fields, «تعديل الدفعة»/«تعديل المصروف» titles. Pencil buttons sit next to
  the delete action in the payments history and expenses tables.

Phase 20 standardized display formats: dates render as `DD-MM-YYYY` on-screen
and in reports, while timetable/session times use a persisted Settings toggle
for 12-hour vs 24-hour display with Arabic/English meridiem labels.

Phase 21 was rolled back: per-group monthly session plans (حصص الصف) were
removed because their attendance shared `session_attendance` with the weekly
timetable sheets, so the monthly view's session stats were mixing two
systems. Removed in full: the `monthly_sessions` table and
`study_groups.sessions_per_month` (migration v9 DROPs both), the
`src/features/sessions/` feature, the attendance page's third tab, the
`tm-sessions-per-month` settings + group-form field.

Phase 23 removed the weekly session-attendance statistics from the monthly
attendance view: the «حضور الجلسات الأسبوعية» card (session summary cards,
per-group `MonthlySessionTable`, and the `session*` fields of
`StudentMonthlyRow`) and its data path (`sessionMonthlyStats` in
`attendance-repo.ts`) are gone — the monthly view keeps only the daily
monthly summary. The `session_attendance` table and the per-session sheets
on the timetable page are unaffected.

The daily attendance tab lists only today's scheduled groups: with no group
filter, the roster is the (deduped, active) members of the groups that have a
`group_sessions` row on the selected date's weekday; a "no sessions today"
empty state shows when the schedule has nothing that day. The manual group
filter still overrides to show any group's members.

Phase 22 tightened which students appear on attendance rosters and how
attendance statuses are counted:

- Groups gained an optional start date (`study_groups.starts_on`, migration
  v10, edited via the group form's «تاريخ البدء» field and shown in the group
  detail dialog); a group whose `starts_on` is after the roster date is hidden
  from the daily roster and "today's sessions" until it begins.
- The attendance status enum gained `excused` (معذور): a fourth purple button
  in `StatusPicker`, persisted to `attendance`/`session_attendance`, and
  counted in every rate (daily / monthly / dashboard KPI / reports) plus the
  monthly tables' `excused`/`sessionExcused` columns (the `attendanceReport`
  else-branch bug that mis-tallied unknown statuses as `late` was fixed too).
- Students gained an enrollment date (`students.enrolled_on`, migration v11):
  recorded in the student form (defaults to today; legacy rows backfilled from
  `created_at`) and shown in the profile as «تاريخ التسجيل:». Rosters filter
  by it via `attendsOn()` in `attendance-cases.ts`
  (`getDaily`/`rosterForDate`/`getMonthly`) and `schedule-cases.ts`
  (`getSessionAttendance`): a student appears from their first day, and in the
  monthly view/rates from their first month. NULL (legacy) means no bound.

Phase 24 was a review round (no schema change):

- Money display standardized via `formatMoney()` in `src/lib/utils/format.ts`:
  Latin digits with thousands separators plus a localized ج.م / EGP suffix.
  Used by the dashboard KPIs (collected / expenses / net), expenses page,
  payments page (due/paid/remaining, totals, per-group section metas,
  history), plans dialog, and the record-payment plan option. Report previews
  format money columns (`MONEY_COLUMNS` in `ReportsPage.tsx`); exported
  Excel/PDF stay numeric.
- Defensive guards: strict payment-period regex, `paymentsReport` remaining
  clamped at zero, active-member filters in the `getDaily`/`getSessionAttendance`
  group branch, membership guard in `setSubmissionStatus`, `session_attendance`
  cleanup on `removeStudentFromGroup`, and submissions/results pruning when a
  student's group changes.
