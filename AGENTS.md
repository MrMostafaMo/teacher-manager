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
| `pnpm build`               | File-length check + `tsc --noEmit` + `vite build` — run before committing |
| `pnpm tauri build`         | Build installers (.deb/.rpm/.AppImage on Linux)               |
| `pnpm test`                | `vitest run` — all unit tests (jsdom)                         |
| `pnpm test:coverage`       | `vitest run --coverage` (v8 provider)                         |
| `pnpm lint:files`          | File-length guard only (200 hard / 150 soft)                  |
| `pnpm db:generate`         | drizzle-kit emits SQL into `drizzle/` after schema changes    |
| `pnpm db:sync`             | Copies + strips migrations into `src-tauri/migrations/`       |

Testing is **Vitest + Testing Library** (jsdom). Unit tests live next to the
source as `*.test.ts(x)` and import `describe/it/expect` explicitly from
`vitest` (no globals). Verification = `pnpm test` + manual E2E in the real
Tauri window (see Verification below). During large refactors the file-length
guard can be skipped with `FILE_CHECK_SKIP=1 pnpm build`.

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

- **i18n**: every user-facing string is translated. Files live under
  `src/lib/i18n/<lang>/` (`ar/`, `en/`) — one file per feature namespace
  (e.g. `common.ts`, `settings.ts`, `payments.ts`), merged and registered by
  `src/lib/i18n/index.ts` via i18next. Use `useTranslation()`; never hardcode
  UI text.
- **File length**: no source file exceeds 200 lines (hard), aim for ≤150.
  Enforced by `scripts/check-file-lengths.mjs` via `pnpm build`. Shared
  zod input helpers live in `src/lib/validation/`.
- **Tests**: every unit gets a `*.test.ts(x)` next to it. Pure layers
  (domain schemas, `src/lib/utils`, application cases with mocked repo
  interfaces, infrastructure with a fake sqlite-proxy executor) are plain
  vitest; UI components render under i18n/theme providers in jsdom.
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
- Static check before commit: `pnpm build` (file-length + tsc + vite) and
  `pnpm test`.

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

Phase 25 added a full activity-log page and a debtors card on the dashboard:

- New `/activity` route (`src/features/activity/ui/ActivityPage.tsx`) reads the
  existing `activity_logs` table via `listRecentActivity(300)` (newest first)
  and renders a table of time (DD-MM-YYYY HH:mm via `formatDateTime`), action
  label, and details. Action strings map to `activity.actions.*` keys via
  `ACTION_KEYS`; entity icons map via `ENTITY_ICONS`. `details` JSON is decoded
  into a joined string (name/title/groupName, resolved `studentId` names from
  `listStudents({ status: "all" })`, `formatMoney` amount, score, `YYYY-MM`
  period). Search filters by localized action label + entity label + details;
  an entity `<select>` filters by `entity_type`. `ActivityLogRow` was fixed to
  `NonNullable<...>` (it was `Row | undefined`).
- Dashboard gains a 9th KPI `outstanding` (مستحقة الشهر, `formatMoney`) and a
  «أعلى المديونين» card listing the top 5 debtors from `dues` (id/name/
  remaining), with a "view all" link to `/payments`; the KPI grid is now
  `md:grid-cols-3` (9 tiles, 3×3).

Phase 26 was a UI-polish / shared-component round (no schema change):

- Dashboard fixes: KPI numbers use `formatNumber` (Latin digits), the
  week-header stale after midnight bug in WeekGrid, a `dashboard.debtors.viewAll`
  i18n key for the debtors "view all" link, and exact sub-route highlighting in
  the app header.
- Shared components promoted into `src/shared/` and adopted app-wide:
  `Modal` (with a scale/fade entry animation honoring `prefers-reduced-motion`),
  `Select` + `Textarea` (native-element wrappers), `Field` (label + error wiring)
  with `mapZodErrors` (`src/lib/utils/zod-errors.ts`) used by all 8 form dialogs,
  `PageHeader` (title/description/actions) on all 13 pages, and `EmptyState`
  (icon + title + optional description). The dead `FeaturePlaceholder.tsx` was
  deleted.
- WeekGrid polish: block heights grow with content (`minBlockHeight(lines)`:
  MIN_BLOCK_H 24 / LINE_H 13 / BLOCK_PAD 14 / MAX_BLOCK_H 52) and a delete
  session now shows a centered confirm chip (also on the Schedule page's
  `SessionCard`). Session times display via localized meridiem labels
  (`common.am` ص / `common.pm` م) instead of hardcoded AM/PM.
- `CollapsibleSection` rewritten: the whole header is a toggle Button with
  `aria-expanded`/`aria-controls`/tooltip; `actions` sit outside the toggle.
- Settings: time format is now a segmented clock12/clock24 control
  (`settings.timeFormat`) and the theme row shows a dynamic Moon/Sun/MonitorCog
  icon from `useThemeStore`.
- `DashboardSkeleton` in `DashboardPage.tsx` mirrors the real layout (9 KPI
  tiles, today's sessions, overdue+debtors, charts, weak skills).
- New `src/shared/useSaveFeedback.ts` hook: returns `{ saving, saved, run, clear }`
  and centralizes the old `saved` boolean + 2.5s auto-clear timer pattern; adopted
  by ExamDetailDialog, StudentSkillsDialog, SessionAttendanceDialog, and the
  daily-attendance view. `run(fn)` guards re-entry and rethrows so callers keep
  their localized error handling. SettingsPage and ReportsPage keep their own
  `"which operation"` string-union state on purpose.

Phase 27 was a final-polish round (no schema change): the student profile
adopted `PageHeader`, PDF text gained cell-level bidi segmentation, Excel
exports set the worksheet RTL flag for Arabic, and an a11y sweep ensured every
icon-only button has an `aria-label` and modals close on Escape.

Phase 28 was a visual-identity + shared-components round (no schema change):

- **Nile identity**: `globals.css` now defines the new palette — `--primary`
  indigo gradient button, `--chart-1..5`, `--primary-strong`, etc.; Cairo
  display font for headings (via `@fontsource/cairo`, trimmed subset) with
  Inter + IBM Plex Sans Arabic for body.
- **App shell**: `Sidebar` (grouped nav, active states, logo badge) and
  `Header` (current page title + section, date, Ctrl K search button) rebuilt
  on the new identity.
- **`DataTable`** (`src/shared/DataTable.tsx`): generic typed table
  (`DataTableColumn<T>` + `getRowKey(row, index)`)
  adopted by every table in the app — students, dues/history, expenses,
  activity, groups, skills, rosters/monthly, exams, homework, plans, reports
  and the student profile.
- **`CommandPalette`** (`src/shared/CommandPalette.tsx`): Ctrl+K / Cmd+K (and
  the Header button) opens a searchable page menu driven by `NAV_ITEMS`;
  arrows/Enter/Escape, state in `src/lib/command-store.ts`.
- **`Avatar`** (`src/shared/Avatar.tsx`): deterministic-initials avatar with a
  5-tone palette; used for student names, the profile header and dashboard
  debtors.
- **Toasts** (`src/lib/toast-store.ts` + `src/shared/ToastViewport.tsx`):
  lightweight zustand toast stack (success/error/info) wired into the
  `useSaveFeedback` save flows (skills, exam results, session attendance,
  daily attendance).
- **Dashboard**: quick-action hero row, prev-month deltas (`data.deltas`) on
  the attendance/collected/expenses/net KPIs (expenses delta is inverted:
  a rise is red), a new student-count "new this month" figure, and two new
  finance trend area charts (collected/expenses + net over 6 months) computed
  in `dashboard-cases.ts` via `paymentRepository.byPeriod` +
  `expenseRepository.byMonth`.

Phase 29 wired global create actions and added week navigation (no schema
change):

- **Global dialog store** (`src/lib/dialog-store.ts`): a zustand store holding
  which create dialog should be open (`GlobalDialogId` =
  student/payment/expense/group/schedule/homework/exam/skill). `GlobalDialogs`
  (`src/shared/GlobalDialogs.tsx`, mounted once in `AppLayout`) renders the
  matching dialog; on save it closes and dispatches `tm:data-changed`, which
  remounts the routed page so it re-fetches.
- **Command palette actions**: `CommandPalette` now lists the create dialogs
  (marked with a "+" hint) plus "Mark attendance" alongside `NAV_ITEMS`;
  choosing one opens the matching dialog. Dashboard quick actions "Add
  student" / "Record payment" / "Add expense" open the real dialogs too
  ("Mark attendance" still navigates).
- **Week navigation**: `WeekGrid` gained prev/next week buttons, a "Today"
  reset, and a week-range label (`DD-MM-YYYY`). The current-week highlight and
  now line only render on the current week.
- **Profile edit**: the student profile header gained an «تعديل الطالب» button
  opening `StudentFormDialog` in edit mode; saving refreshes the profile.
- `DataTable` lost its unused `stickyHeader` prop.

Phase 30 added a per-student statement of account (كشف الحساب — no schema
change):

- `studentStatement(studentId)` in `payment-cases.ts` builds a monthly
  summary from the student's enrollment month (or first paid period) through
  today, charging the *current* plan amount each month and crediting that
  month's payments (`due`/`paid`/`balance` + a cumulative `running` that can
  go negative = advance), plus a chronological payment ledger with the running
  paid total.
- `buildStudentStatementReport(studentId, t)` in `report-cases.ts` turns the
  statement into a chronological ledger `ReportData` (month-due rows followed
  by that month's payments, closing total row); `statement` was added to the
  `ReportKey` union, and `buildReportData`'s switch throws on it since the
  statement needs a student id.
- `StudentStatementDialog` (`src/features/student-profile/ui/`): a modal with
  the monthly summary table, totals line, and payment ledger; Excel/PDF export
  reuse the generic exporters. A «كشف الحساب» button in the profile header
  (next to «تعديل الطالب») opens it.

Phase 31 added per-student trend charts (التحليلات — no schema change):

- `buildStudentTrends` (`student-trends.ts`): a pure function over the
  already-loaded `StudentProfileData` (no new queries) returning four series
  for the profile page — attendance per month (present/late/absent/excused
  counts), exam scores (percent of max, ordered by date, latest 15), homework
  completion per month, and payments per month (from `payments.period` or
  `paidAt`). Monthly series cover the latest 8 months with the dashboard's
  `MM/YY` label format.
- `StudentTrendsSection` (`src/features/student-profile/ui/`): a «التحليلات»
  section between the stats grid and the record tables, holding a
  `md:grid-cols-2` grid of four recharts cards (stacked attendance bars,
  exam-score line, homework bars, payment bars). Charts are `dir="ltr"` with a
  theme-aware tooltip; each card has a localized «لا توجد بيانات بعد» empty
  state. Money/pct in tooltips reuse `formatMoney` / `formatNumber`.
- i18n: `profile.sections.trends` + `profile.trends.*` in both locales.

Phase 32 was a code-health round (no schema change): every source file split
to ≤150 lines and the campaign verified with tsc, `pnpm test`, and a full
`pnpm build`:

- i18n moved from single `ar.ts`/`en.ts` files to per-language dirs
  (`src/lib/i18n/ar/*.ts`, `src/lib/i18n/en/*.ts`), merged by
  `src/lib/i18n/index.ts`.
- Shared picker internals promoted to `src/shared/` (`date-picker.tsx`,
  `month-picker.tsx`, `picker-shared.ts`, `popover-shell.tsx`) plus
  `useConfirmDelete` (+ test) and `useInView`.
- Feature module splits: dashboard (data/chart/KPI/section cards), attendance
  (roster/sections/summary/status-defaults), schedule (week-layout helpers,
  day/group views, week nav), students/profile (columns/overview/records/
  trends/statement), payments (dues/history grouping/statement), expenses,
  exams/homework/skills/activity/groups, reports (builders/financials/
  helpers, bidi shaping), settings (cards).
- Two smell fixes: the string `DAYS` moved to `src/features/schedule/domain.ts`
  (consumed by week-layout, use-schedule-view, WeekGrid); the profile's
  `useActivityColumns` renamed `useProfileActivityColumns` (distinct from the
  activity feature's hook).
- 9 new unit-test files (~80 cases) cover the extracted helpers: week-layout,
  use-schedule-view, `buildSectionsByGroup`, history grouping, dashboard
  helpers, bidi levels, payment statement, attendance defaults,
  `useConfirmDelete`. Suite: 10 files / 80 tests, all green; every file
  within the 150-line guard.

Phase 33 added daily speed-ups (no schema change):

- **Mark-all-present + reset** in the daily attendance view: `BulkActions`
  (`src/features/attendance/ui/bulk-actions.tsx`) built on the pure helpers
  `markAllPresent`/`isDirty` (`attendance/application/attendance-bulk.ts`,
  + test); the reset button appears only while the draft has unsaved changes.
- **Printable roster PDF**: `PrintRosterButton` (`attendance/ui/`) exports
  the visible roster via `exportRosterPdf` → the self-contained A4 builder
  `attendance/infrastructure/roster-exporter.ts` (fontkit Arabic shaping,
  RTL name/status layout, repeated header rows) → the shared `saveFile()`
  (`src/lib/export/save-file.ts`, native save dialog + write).
- **Shared PDF kit**: `src/lib/export/pdf-kit.ts` holds the A4 constants,
  palette, `loadArabicFont()` and `drawShapedText`/`drawFittedText`;
  `reports/infrastructure/pdf-exporter.ts` was refactored onto it so every
  PDF shares one rendering core (reports, rosters, and later receipts).
- **Expense category donut**: `ExpenseCategoryChart` (`expenses/ui/`) on the
  expenses page, driven by pure `categoryTotals` (`expenses/application/
  expense-stats.ts`, + test); colors follow `--chart-1..5`.
- **Save-flow hook**: `useDailySave` (`attendance/ui/use-daily-save.ts`)
  centralizes persist + toast + baseline refresh, with `saveError` separate
  from load errors.
- i18n: `attendance.markAllPresent`, `attendance.resetDraft`,
  `attendance.printRoster`/`rosterPrinting`/`rosterSaved`/`rosterError`/
  `rosterTitle`, `expenses.byCategory` (ar + en).
- Suite: 13 files / 94 tests, all green; `tsc --noEmit` clean; `pnpm build`
  passes; every file within the 150-line guard.

Phase 34 added a per-payment receipt PDF (إيصال دفع — no schema change):

- `receiptRows` (`payments/application/receipt-rows.ts`, + test) builds the
  label/value field list (student, plan, period, method, date, amount —
  highlighted — note) with `—` fallbacks; `getPaymentReceiptData`
  (`receipt-data.ts`) narrows a history row into `PaymentReceiptData`
  (names come from the history query — no extra DB lookups).
- `buildReceiptPdf` (`payments/infrastructure/receipt-exporter.ts`) renders a
  single A4 page via the shared pdf-kit: title + rule, two-column RTL-aware
  label/value rows, the amount row on a band at a larger size, closing rule +
  footer. `exportReceiptPdf` (`application/receipt-export.ts`) goes through
  the native save dialog via `saveFile()`.
- `usePaymentReceipt` (`payments/ui/use-payment-receipt.ts`) localizes labels,
  formats date/money/method, tracks a busy row id, and toasts success/error;
  a receipt icon button sits next to edit/delete in `HistoryTable`, threaded
  through `HistorySections` into `HistoryView`.
- i18n: `payments.date`, `payments.receipt`,
  `receiptTitle`/`receiptFooter`/`receiptSaved`/`receiptError` (ar + en).

Phase 35 added a student report card PDF (بطاقة تقرير — no schema change):

- `src/features/report-card/` follows the receipt pattern: `buildReportCardData`
  (`application/report-card-data.ts`, + test) aggregates the already-loaded
  `StudentProfileData` with zero new queries (attendance summary, homework
  done/total, scored exams, weak skills); `buildReportCardPdfData`
  (`application/report-card-pdf-data.ts`, + test) composes the localized
  label/value strings with «لا يوجد» fallbacks; `buildReportCardPdf`
  (`infrastructure/report-card-exporter.ts`) renders one A4 page via the
  shared pdf-kit; `exportReportCardPdf` (`application/report-card-export.ts`)
  goes through the native save dialog via `saveFile()`.
- `useReportCard` (`ui/use-report-card.ts`) localizes labels, tracks a busy
  flag, and toasts saved/error; a «بطاقة التقرير» button (busy-disabled) sits
  in the profile header next to «تعديل الطالب» and «كشف الحساب».
- i18n: `reportCard.*` namespace (ar + en).
