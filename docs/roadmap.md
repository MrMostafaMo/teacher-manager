# Roadmap

Milestone-driven build plan. Each phase must **compile and run** before the
next begins, and ends with a review checkpoint.

| #    | Phase                                    | Status      |
| ---- | ---------------------------------------- | ----------- |
| 0    | Scaffold, deps, Tauri/Tailwind/shadcn, SQLite + Drizzle, RTL | ✅ Done |
| 1    | Layout: sidebar, header, routing, theme + language switchers, dashboard placeholder | ✅ Done |
| 2    | Full normalized schema (13 tables), migration, repository layer, activity log | ✅ Done |
| 3    | Students: CRUD, validation, search, filters, profile, parents | ✅ Done |
| 4    | Attendance: daily/monthly, percentage, late | ✅ Done |
| 5    | Study groups (الفرق): CRUD, members, group-scoped attendance | ✅ Done |
| 6    | Payments: subscription, paid/remaining/due, history | ✅ Done |
| 7    | Homework: assign/submit, completion % | ✅ Done |
| 8    | Exams: creation, grades, avg/high/low | ✅ Done |
| 9    | Skills, weak points, per-student analytics | ✅ Done |
| 10   | Reports: PDF + Excel exports | ✅ Done |
| 11   | Dashboard analytics, charts, KPIs | ✅ Done |
| 12   | Backup/restore, settings, DB export | ✅ Done |
| 13   | Polish: animations, a11y, performance, packaging | ✅ Done |
| 14   | Weekly timetable (الجدول): recurring group sessions, grid page, dashboard "today" | ✅ Done |

## Phase 14 — completed

- Schema: new `group_sessions` table (migration v5) — `groupId` FK to
  `study_groups` (cascade), `dayOfWeek` (0=Sun … 6=Sat), `startTime`/`endTime`
  "HH:mm", optional `room`, unique `(groupId, dayOfWeek, startTime)` so a group
  can't double-book the same slot.
- Feature: `src/features/schedule/` (domain zod → application cases → infra
  repo joining group name/status; `clearForGroup` cleanup on group delete).
- UI: `SchedulePage` — 7-column day grid (today's column ring-highlighted),
  session cards (group, time, room) with edit/delete (two-click confirm);
  `ScheduleFormDialog` — group picker, day, native `input type="time"`,
  room; end-after-start validation.
- Integration: `/schedule` route + sidebar item (`CalendarDays`, phase 14);
  dashboard "Today's sessions" card (next 4 active sessions, navigates from
  the same schedule data).
- i18n: `schedule.*` namespace + `nav.schedule` + `dashboard.today.*` (en/ar).
- `tsc --noEmit` clean, `pnpm build` passes.

## Phase 15 — planned

- TBD (teacher requested features: e.g. release v1.0.0, print layouts,
  multi-teacher, session attendance per group).

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

## Phase 1 — completed

- Routed app shell: `createBrowserRouter` with a lazy-loaded route per feature
  (real code splitting — each page is its own chunk, main bundle 352 kB).
- Layout: fixed sidebar (brand, 8 nav links with active state, RTL-aware
  logical properties) + sticky header (page title, language & theme dropdowns)
  + scrollable main area. `ErrorBoundary` at the root, `RouteErrorPage` for
  route errors — the window never blanks.
- Dashboard placeholder: welcome heading, "built in Phase 10" state, and a
  live local-database status card (schema check + `last_opened_at` bootstrap
  moved to `lib/db/bootstrap.ts`, fired on launch).
- Feature stubs (`src/features/*/ui/*Page.tsx`) share one `FeaturePlaceholder`
  component; each shows its icon, translated description and milestone.
- Language switch now re-applies `dir`/`lang`/dayjs live (fixed a regression
  from the smoke screen — the shell re-syncs on store change).
- Verified headlessly via CDP against the dev server: all 10 checks pass
  (RTL render, 8 nav items, route change to Students, language switch
  ar→en→ar, theme switch light/dark with persistence, reload keeps state).
   Real Tauri window renders and writes to SQLite (`schema_version=1`).

## Phase 2 — completed

- Full normalized schema in `src/lib/db/schema.ts`: 13 domain tables plus
  `app_meta` — `students`, `study_groups`, `student_groups` (M2M), `attendance`
  (unique student+group+date), `plans`, `payments`, `homeworks`,
  `homework_submissions` (unique homework+student), `exams`, `exam_results`
  (unique exam+student), `skills`, `student_skills`, `activity_logs` — with
  exported TS types, all `id` TEXT UUID PK + `created_at`/`updated_at`
  unix-ms.
- Migration pipeline exercised: `db:generate` (0001) → `db:sync` →
  embedded in `src-tauri/src/lib.rs` (`add_migrations` v1+v2) → auto-applied.
  Verified in `_sqlx_migrations`; all 14 tables exist.
- Generic repository layer `src/lib/db/repository.ts`: `findById/list/count/
  insert/update/remove` typed per entity, UUIDs via `src/lib/utils/uuid.ts`.
- Activity log `src/lib/activity-log.ts`: `logActivity({ action, entityType,
  entityId?, details? })` writes an audit row (never throws), plus
  `listRecentActivity(limit)` newest-first; bootstrap logs `app.launch` on
  every start.
- Fixed a real DB driver bug: the Drizzle `sqlite-proxy` callback returned
  column **objects** to `get`/`all` while Drizzle maps rows positionally, so
  every `select` silently returned empty and inserts failed with
  `UNIQUE constraint failed` — nothing was written. The callback now returns
  positional value arrays (see `src/lib/db/client.ts`).
- Verified in the real Tauri (WebKit) window: `last_opened_at` updates on each
  launch and `activity_logs` gains one `app.launch` row per launch (two rows
  confirmed across two launches, UUID ids). CDP UI harness still 10/10.

## Phase 3 — completed

- Feature layer for students following the domain/infrastructure/application/
  ui split:
  - `src/features/students/domain.ts` — Zod `studentInputSchema`
    (name 1–100, `optionalText` trims blanks to undefined, status enum).
  - `src/features/students/infrastructure/student-repo.ts` — repository over
    the generic CRUD with `search({ query, status })` (`like` on name/phone/
    guardianName + optional `eq(status)`, name asc).
  - `src/features/students/application/student-cases.ts` — list/create/update/
    delete cases, parse → repo → `logActivity("student.create|update|delete")`.
  - `src/features/students/ui/` — `StudentsPage` (search + status filter,
    count badge, table with row actions, loading/empty/no-results states),
    `StudentFormDialog` (add/edit, Zod field errors, saving state),
    `StudentDetailDialog` (profile, guardian rows, two-step delete),
    native `<dialog>` `Modal`, `StatusBadge`.
- i18n: full `students.*` namespace in both locales.
- Verified end-to-end in the real Tauri (WebKit) window against SQLite:
  create, list, profile view, edit (persisted + `student.update`), delete via
  profile and row action (two-step confirm, DB row gone + `student.delete`),
  search filtering, and status filter (كل الحالات → غير نشط → back).
  `activity_logs` records `student.create` with `{"name": ...}` details.
- `tsc --noEmit` clean, production build passes.

## Phase 4 — completed

- Attendance schema: `attendance` table now tracks per student per date
  (unique `attendance_student_date`); `group_id` made nullable (no
  study-groups feature yet). Migration `0002_fat_fantastic_four.sql` registered
  in the Rust binary (applied at launch).
- Feature layer mirroring students:
  - `src/features/attendance/domain.ts` — `ATTENDANCE_STATUSES` present/absent/
    late, `attendanceStatusSchema`, `saveAttendanceSchema`.
  - `src/features/attendance/infrastructure/attendance-repo.ts` — generic CRUD
    plus `byDate`, `byStudentAndDate`, `upsert`, `monthlyStats`.
  - `src/features/attendance/application/attendance-cases.ts` — `getDaily`,
    `getMonthly` (per-student monthly counts + attendance rate), `saveDaily`
    (persists one row per student and logs `attendance.save` with full-day
    counts).
  - `src/features/attendance/ui/AttendancePage.tsx` — يومي (date picker,
    per-student حاضر/غائب/متأخر toggle row, live summary cards) and شهري
    (month picker, per-student table with counts + rate, session count +
    average rate).
- i18n: full `attendance.*` namespace in both locales.
- Fixed a subtle Drizzle driver bug: `drizzle-orm/sqlite-proxy` 0.45 maps an
  empty `get()` result to `{}` instead of `undefined`, so existence checks saw
  a phantom row and attendance `upsert` always took the update branch (nothing
  was ever inserted). Fixed in `src/lib/db/client.ts` by returning a falsy
  `rows` for empty `get` results — repaired `findById`, `byStudentAndDate`,
  `getMeta`, and `count` in one place.
- Verified end-to-end in the real Tauri window against SQLite: daily sheet
  loads active students, marking updates the live summary, save persists one
  row per student for the date (present included), reload shows the saved
  state, monthly view shows correct per-student counts and rates, and
  `activity_logs` records `attendance.save` with full-day counts.
- `tsc --noEmit` clean, production build passes.

## Phase 5 — completed

- Study groups (الفرق): assign students to groups, group-scoped attendance.
- No migration needed — `study_groups` and the `student_groups` join table
  (unique `student_groups_student_group`) existed since migration 0001.
- Feature layer mirroring students:
  - `src/features/groups/domain.ts` — `studyGroupInputSchema` + `StudyGroupInput`.
  - `src/features/groups/infrastructure/group-repo.ts` — generic CRUD plus
    `list()` (member counts via `count()` groupBy), `members`/`nonMembers`
    (active students not yet in the group), `addMember`, `removeMember`,
    `clearMembers` (FKs are off, so deletes clear the join table explicitly).
  - `src/features/groups/application/group-cases.ts` — `listGroups`,
    `getGroupDetail` (parallel findById + members + nonMembers), create/update/
    delete (clearMembers before remove), add/remove student; each logs
    `group.*`.
  - `src/features/groups/ui/` — GroupsPage (table + two-step delete),
    GroupFormDialog, GroupDetailDialog (members with per-row remove + an
    add-student select).
- Attendance group filter: the daily sheet takes an optional `groupId` and
  lists only that group's members (`getDaily(date, groupId)`), driven by a
  group dropdown in the toolbar.
- i18n: full `groups.*` namespace plus `nav.groups` in both locales.
- Fixed a proxy join bug: `select().innerJoin(...)` through the sqlite-proxy
  driver mis-mapped the joined table's columns (members showed names where ids
  were expected). Resolved by selecting the student columns explicitly with a
  `{ id, name, ... }` object instead of relying on the auto-split join shape.
- Verified end-to-end in the real Tauri window against SQLite: create group,
  list with member counts, detail dialog, add all students (join rows +
  `group.member.add`), remove a student (`group.member.remove`, student returns
  to the available list), delete group via two-step confirm (join rows cleared
  via `clearMembers`, `group.delete` logged), and the attendance dropdown
  filters the daily sheet to the group's members and back to all students.
- `tsc --noEmit` clean, production build passes.

## Phase 6 — completed

- Payments (المدفوعات): subscription plans, monthly dues with paid/remaining,
  and payment history.
- Migration 0003 (`student subscription plan`): added nullable `students.plan_id`
  referencing `plans.id`. `plans` moved above `students` in `schema.ts` because
  drizzle's FK thunk is resolved eagerly at table build. Generated a plain
  `ALTER TABLE students ADD plan_id ...` (nullable FK — SQLite permits this),
  synced to `src-tauri/migrations/`, registered as version 4 in `lib.rs`.
  Auto-applied on next launch (no FK enforcement, so deletes still detach
  explicitly).
- Feature layer:
  - `src/features/payments/domain.ts` — `planInputSchema` (name, integer
    positive `amount`, `billingInterval`), `paymentInputSchema` (studentId,
    optional planId, amount, `period` as YYYY-MM, method cash/card/transfer,
    note); `optionalId` normalizes blank select values to `undefined`.
  - `src/features/payments/infrastructure/plan-repo.ts` — generic CRUD plus
    `list()` with `memberCount` (students per plan via `count()` groupBy).
  - `src/features/payments/infrastructure/payment-repo.ts` — generic CRUD plus
    `byPeriod` / `byStudent` (paidAt desc).
  - `src/features/payments/application/plan-cases.ts` — create/update/delete
    (`deletePlan` clears student subscriptions first via
    `studentRepository.clearPlan` — FKs are off), logging `plan.*`.
  - `src/features/payments/application/payment-cases.ts` — `recordPayment`
    (logs `payment.create` with studentId/amount/period), `deletePayment`,
    `monthlyDues(period)` (active students joined to their plan in JS +
    summed period payments → due/paid/remaining per student), and
    `listPaymentHistory` (payments + resolved student/plan names).
- UI:
  - `PaymentsPage` — two tabs (مستحقات الشهر / السجل). Dues view: month picker +
    per-student due/paid/remaining table with status badges (مدفوع / عليه باقي /
    بدون خطة). History view: student filter + newest-first payment list with
    per-row two-step delete. Record-payment and manage-plans buttons in the
    header; a shared `reloadKey` refreshes both views after any mutation.
  - `RecordPaymentDialog` — student + plan (pre-fills the amount) + period
    (defaults to the visible month) + method + note.
  - `PlansDialog` + `PlanFormDialog` — plan CRUD with subscriber counts.
- Students feature now carries the subscription: `planId` added to
  `studentInputSchema`, a plan dropdown in `StudentFormDialog`, and the plan
  name shown in `StudentDetailDialog`.
- i18n: full `payments.*` and `plans.*` namespaces plus `students.fields.plan` /
  `students.noPlan` in both locales.
- Verification pending E2E: create plan → assign to a student → record partial
  payment → dues update → record the rest → "مدفوع" badge → history rows →
  `plan.create`/`payment.create` activity log entries.
- `tsc --noEmit` clean, production build passes.
- E2E verified through the running app (AT-SPI): created plan اشتراك شهري 500 →
  assigned to سارة أحمد → recorded 300 + 200 → مستحق 500 / مدفوع 500 / باقي 0 →
  badge "مدفوع" → history rows, filter and two-step delete verified →
  `plan.create`/`payment.create`/`payment.delete` activity log entries.

## Phase 7 — completed

- Homework (الواجبات): assign homework to a group, per-student submit status,
  completion percentage. Schema for `homeworks` / `homework_submissions`
  already existed since migration 0001 — no new migration was needed.
- Data model: submissions are created lazily (a row appears only when a status
  is set; a student without a row counts as pending), so group membership can
  change after an assignment without row-sync bugs. Completion % =
  `(submitted + late) / members`, computed in JS.
- Feature layer:
  - `src/features/homework/domain.ts` — `homeworkInputSchema` (groupId, title,
    description, dueDate YYYY-MM-DD), `submissionStatusSchema`
    (`submitted|pending|late`).
  - `src/features/homework/infrastructure/homework-repo.ts` — generic CRUD
    plus `list()` (resolved group name + submission counts per status via
    `count()` groupBy), `byHomework` (submissions keyed by studentId),
    `upsertSubmission` (insert-or-update, nulls `submitted_at` back on
    pending), `clearForHomework`, `clearForGroup` (submissions then homeworks
    — FKs are off), `groupName`, `members`.
  - `src/features/homework/application/homework-cases.ts` — `listHomeworks`,
    `getHomeworkDetail` (members via `groupRepository.members` + status map),
    create/update/delete (delete clears submissions first), and
    `setSubmissionStatus` upsert. All log `homework.create/update/delete/submit`.
- UI:
  - `HomeworkPage` — homework list with group, due date and completion bar,
    empty state, add button, detail/edit/delete actions (two-step delete).
  - `HomeworkFormDialog` — group select + title + `<input type="date">` due
    date + description.
  - `HomeworkDetailDialog` — completion % bar with submitted/late/pending
    counts, per-student three-state toggle (تم / قيد الانتظار / متأخر).
- `deleteGroup` in `group-cases.ts` now clears the group's homework +
  submissions before removing the group (orphaned rows otherwise).
- i18n: full `homework.*` namespace in both locales.
- E2E verified through the running app (AT-SPI): created a group with a member
  student → created homework with a title → detail showed the student pending →
  toggled submitted/late (counts updated) → list completion reached 100% →
  two-step delete emptied the list and cleared the submission rows →
  `homework.create`/`homework.submit`/`homework.delete` activity log entries.
  Note: `dueDate` was left unset in E2E — WebKitGTK's native `<input
  type="date">` segments are not scriptable via AT-SPI (and date-widget
  interaction crashes the WebProcess), so the picker is exercised by real
  users only. The field is optional and renders as "—" when empty.
- `tsc --noEmit` clean, production build passes.

## Phase 8 — completed

- Exam feature (Exams / الاختبارات): `src/features/exams/` — domain schemas
  (`examInputSchema`: group/title/maxScore/date; `examResultSchema`),
  `exam-repo.ts` (CRUD + list with group name, member/result counts and SQL
  average, `byExam`, `upsertResult`/`removeResult`, `clearForExam`,
  `clearForGroup`, members), `exam-cases.ts` (list/detail with completion %
  and JS stats — average/highest/lowest/pass rate at ≥50% of maxScore —
  create/update/delete, batch `saveExamResults`; empty score clears a result).
- `ExamFormDialog` — group/title/max score/date; `ExamDetailDialog` — stats
  header + per-student score/note inputs with a batch Save button (attendance
  style). List shows completion bar + average.
- `deleteGroup` in `group-cases.ts` now clears the group's exams + results
  too (orphaned rows otherwise). Same lazy-result model as homework: a student
  without a result row is simply ungraded.
- i18n: full `exams.*` namespace in both locales.
- No migration — `exams`/`exam_results` existed since migration 0001.
- Note: `date` is a native `<input type="date">`, same AT-SPI limitation as
  the homework due date (recorded via real users; left null in E2E).
- E2E verified through the running app (AT-SPI): created an exam with the
  group pre-selected → detail showed the member ungraded (stats —) → entered
  score 85 → stats read avg 85 / high 85 / low 85 / pass 100% and the list
  completion hit 100% with avg 85 → cleared the score (empty = row removed,
  back to 0 results) → two-step delete emptied the list →
  `exam.create`/`exam.result`/`exam.delete` activity log entries.
- `tsc --noEmit` clean, production build passes.

## Phase 9 — completed

- Skills feature (Skills / المهارات): `src/features/skills/` — domain
  (`skillInputSchema`, levels 1–5, `WEAK_LEVEL = 2`), `skill-repo.ts` (catalog
  CRUD + `list` with tracked/weak student counts, `levelsByStudent`,
  `upsertLevel`/`removeLevel`, `clearForSkill`/`clearForStudent`),
  `skill-cases.ts` (create/update/delete + `getStudentSkills`/`saveStudentSkills`
  batch editor; empty level clears a row). Logs `skill.create/update/delete/level`.
- New nav item "المهارات" (`/skills`, phase 9): `SkillsPage` catalog with
  weak-point counts per skill + `SkillFormDialog` (two-step delete).
- `StudentDetailDialog` gains a skills section (tracked/weak summary +
  "إدارة المهارات" button) opening `StudentSkillsDialog` — table of the whole
  catalog with a level select (1–5, blank = unset) + note, batch Save; rows at
  level ≤ 2 highlighted as weak.
- `deleteStudent` now clears the student's skill rows (FKs are off).
  Note: `deleteStudent` still orphans other child rows (attendance, memberships,
  submissions, exam results) — pre-existing, wider cleanup recommended later.
- i18n: `nav.skills`, `features.skills`, full `skills.*` namespace, and
  `students.skills`/`students.manageSkills` in both locales.
- No migration — `skills`/`student_skills` existed since migration 0001.
- `tsc --noEmit` clean, production build passes.

## Phase 10 — completed

- Reports feature (Reports / التقارير): `src/features/reports/` — domain
  (`ReportKey` = students|attendance|exams|payments|skills, `ReportData`),
  `application/report-cases.ts` (5 cross-table report builders reading straight
  from the db: students with plan/groups/status, attendance sums per student,
  exams with per-exam result detail rows, payments plan/paid/balance per
  student, skills tracked/weak counts + weak list with level).
- Excel export via `xlsx` (`infrastructure/excel-exporter.ts`): AOA sheet named
  `data.key`, 22-char column widths. ponytail: the sheet RTL flag (`!dir`) is
  not written by xlsx@0.18 — spreadsheet apps shape Arabic natively regardless.
- PDF export via `pdf-lib` + `@pdf-lib/fontkit` (`infrastructure/pdf-exporter.ts`):
  A4 RTL table; **all text drawn as vector paths** — pdf-lib's drawText has no
  complex-script shaping, so fontkit `layout()` (runs GSUB Arabic shaper) feeds
  per-glyph `path.toSVG()` draws, pen advanced by `xAdvance`. Bundled
  `PakTypeNaskhBasic.ttf` (has GSUB) under `reports/assets/`, loaded via `?url`.
  Tabs/pages break automatically; longest-cell column widths capped at 40%.
- Native save dialogs via `@tauri-apps/plugin-dialog` + write via
  `@tauri-apps/plugin-fs`; plugins registered in `src-tauri` (Cargo.toml,
  `lib.rs`, capabilities `dialog:default` + `fs:allow-write-file` globs).
- `ReportsPage` (`ui/ReportsPage.tsx`): 5 report-type tabs with live preview
  table, تصدير Excel / تصدير PDF buttons, exporting/saved/error states.
- i18n: full `reports.*` namespace (labels, titles, per-type headers, export
  messages) in both locales.
- Deps already in package.json (`pdf-lib`, `xlsx`) now used; added
  `@pdf-lib/fontkit`, `@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-fs`.
- `tsc --noEmit` clean, production build passes, E2E verified: 5 tabs render
  live data, both exports save valid files (Excel re-read with xlsx; PDF
  rendered and inspected for shaped glyphs).

## Phase 11 — completed

- Dashboard feature (`src/features/dashboard/`):
  - `application/dashboard-cases.ts` — `getDashboardData()` aggregates across
    repos (students active/all, monthly attendance, monthly dues, homework
    counts, exam average, weak skills) into one `DashboardData` shape.
  - `ui/DashboardPage.tsx` — 6 KPI cards (total/active students, attendance
    rate, collected, homework completion, exam average) + Recharts charts:
    stacked attendance trend bar (present/late/absent per month, 6 months),
    homework status pie with legend, and a weak-skills bar list.
  - i18n: full `dashboard.*` namespace in both locales.
- Close-out bug fixed: `monthShort()` destructured `YYYY-MM-DD` but the
  attendance trend returns `YYYY-MM`, so `yy.slice(2)` threw
  (`undefined is not an object`) and react-router's `RouteErrorPage` blanked
  the whole window — only visible in the real Tauri window (headless DOM
  checks never reach the chart because the data fetch needs `invoke`).
  Fixed to `const [y, m] = iso.split("-")`, handles both shapes.
- Verified in the real Tauri (WebKit) window via AT-SPI: shell + all 10 nav
  links render, dashboard welcome heading and the attendance trend legend
  (the former crash site) render with live data; no route/boundary error.
- `tsc --noEmit` clean, production build passes.

## Phase 12 — completed

- Settings feature (`src/features/settings/`):
  - `infrastructure/backup-service.ts` — `liveDbPath()`, `liveDbSize()`,
    `backupDatabase(dest)` via `VACUUM INTO` (consistent snapshot of a live
    WAL db in one statement; checkpoint+copy fallback).
  - `application/settings-cases.ts` — `createBackup()` (native save dialog +
    `VACUUM INTO`) and `restoreFromBackup(confirmMessage)` (open dialog →
    validate SQLite magic → warning confirm → close pool → copy backup over
    live db → remove stale `-wal`/`-shm` → reopen + sanity check → reload).
  - `ui/SettingsPage.tsx` — Appearance card (language/theme rows) + Data card
    (db path, live size, backup/restore buttons, status/error states).
- Language + theme switchers extracted from the header into
  `src/shared/AppearanceControls.tsx`; `Header.tsx` reduced to the page title.
- i18n: full `settings.*` namespace in both locales (incl. `restoreConfirm`).
- Capability fixes found by E2E: `fs:allow-stat` was missing (db size showed
  `0 B`), and `$HOME/**` does **not** match hidden dirs (`require_literal_leading_dot`
  on Unix) so `~/.config/...` was forbidden — added `$APPCONFIG/**` to the
  read/copy/remove/stat scopes. Restore + size now work.
- Verified in the real Tauri window via AT-SPI + xdotool: backup creates a
  valid snapshot (sqlite3 integrity check), restore replaces live data and
  drops stale WAL sidecars, cancel keeps data intact, non-SQLite file shows
  the invalid-backup error, db path/size render, language/theme switchers
  persist. `tsc --noEmit` clean.

## Phase 13 — completed

- Accessibility:
  - `Modal.tsx`: close button uses the translated `common.close` label
    (was hardcoded English); dialog now sets `aria-labelledby` to its title.
  - `globals.css`: global `prefers-reduced-motion` guard — animations and
    transitions collapse for users who request reduced motion.
- Animations: modal enter animation via `tw-animate-css` utilities
  (`open:animate-in open:zoom-in-95` + backdrop `fade-in`). Exit animation
  deliberately skipped (native `<dialog>` closes synchronously).
- Performance:
  - Fonts trimmed to the subsets the UI actually renders — Inter `latin-*`
    and IBM Plex Sans Arabic `arabic-*` only (was importing every subset:
    cyrillic/greek/vietnamese/latin-ext).
  - Removed unused `sonner` dependency (no Toaster mounted anywhere).
  - `recharts` chunk left as-is (desktop app loads from disk; code-splitting
    a 1.4 MB chunk is not worth the risk for this use case).
- Packaging:
  - `tauri.conf.json`: strict CSP replacing `null` —
    `default-src 'self'`, `connect-src ipc: http://ipc.localhost`,
    `style-src 'unsafe-inline' 'self'` (inline styles are used), `font-src`,
    `img-src`, `script-src 'self'`. Verified end-to-end in the release binary.
  - `pnpm tauri build` produces all three Linux bundles:
    `.deb`, `.rpm`, and `.AppImage`.
  - AppImage needed `NO_STRIP=1` — the bundled linuxdeploy's old `strip`
    chokes on `.relr.dyn` sections in modern (Fedora) system libs.
- Release verification (non-visual, deterministic):
  - Release binary launches with a rendered dark UI (screenshot pixel
    analysis, 98% dark — no white-screen from the CSP).
  - Launched with a fresh `XDG_CONFIG_HOME`: SQL plugin applied all 4 embedded
    migrations and created the full 15-table schema automatically — IPC +
    CSP + DB pipeline all working in the production build.
- `tsc --noEmit` clean, `pnpm build` passes, `AGENTS.md` created with
  project commands, architecture, conventions and gotchas.
