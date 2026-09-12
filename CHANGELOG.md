# Changelog

## Unreleased

- **Database health gate:** boot-time `verifySchema()` (`PRAGMA quick_check` +
  expected-tables check) blocks the content with the missing tables, a copy
  button, and a link to backup settings instead of half-empty screens; group/
  schedule/attendance load failures now toast the underlying error; restore
  verifies every expected table after the swap and reports `restoreIncomplete`
  (with rollback) instead of a false "done". The gate is now tiered: missing
  transient tables (`plan_price_history` + its sync trigger, `activity_logs`,
  `notifications`, `sync_tombstones`) are recreated empty from verbatim
  migration DDL with a notice instead of blocking the whole app. No schema
  change.

- **Session counter rebuilt from scratch:** the counter is attendance-only
  (`1/8 … 8/8` then wraps to `1/8` with a cycle number; present/late/absent
  count, excused never does, each day counts once even when recorded in both
  the daily roster and a session sheet). Payment is an independent
  paid/unpaid badge per cycle (total paid ÷ plan amount) and never moves the
  counter. Removed: proportional partial payments, manual ± session adjust,
  per-session price/remaining, session notifications, and per-group cycle
  settings (global only). The statement's sessions mode shares the same
  definition. No schema change.

## v0.11.3

- **Dashboard resilience:** dimensions now load with `Promise.allSettled` — one
  failing source is logged and falls back instead of blanking the whole
  dashboard with «تعذّر تحميل لوحة التحكم». The error card shows the
  underlying message with a copy-details button. No schema change.
- **Windows data recovery docs:** `README.ar.md` documents the live DB path
  (`%APPDATA%\com.teachermanager.app\teacher-manager.db`), the
  run-as-administrator empty-profile pitfall, and the 0.11.0 `perMachine`
  installer note.

## v0.11.0

- **Unified settings (`tm-settings` v1):** the eight persisted slices
  (theme, language, time, week, sidebar-pin, session, notifications,
  shortcuts) now live in one versioned store with a one-time legacy import;
  all legacy stores are thin compatibility shims. Boot reads once
  (`main.tsx`, `index.html` fallback, `theme-custom.ts` fallback).
- **High-contrast access toggle:** `contrast` left the color-swatch picker
  for an accessibility row that remembers and restores the previous theme.
- **Faster reads:** payment history names resolve in one `LEFT JOIN`;
  reports read through `report-repo.ts` (paged lists + counts); session dues
  use grouped SQL counts and compact payment rows; month filters use
  index-friendly ranges; Arabic font load is cached; charts/pdf/excel ship
  in separate chunks.
- **Server paging behind thresholds:** history (500), students/dues/
  expenses (300) switch from grouped sections to flat paged tables above
  the threshold; badges, charts, and totals always stay global; report
  previews page at 100 rows while Excel/PDF exports always re-fetch the
  full set.
- **Dashboard single pass:** ~28 IPC round-trips collapsed into one shared
  fetch (students/plans/memberships/payments/attendance/expenses) with every
  figure derived from the same definitions the feature pages use.
- **Sync docs:** conflict semantics documented as last-writer-wins by design
  (Supabase Storage honors no `If-Match`); storage policies fixed to the
  single `sync` bucket (`{userId}/sync-data.json`, `{userId}/backups/...`).
- **Simpler fetches:** dues and expenses load each month once (badge/chart/
  table share the rows); deleted dead queries (`monthlyTrend`,
  `monthlyExpenseTotal`).

## v0.10.1

- **إصلاح الشريط الجانبي (Sidebar):** زر التثبيت لم يعد عائمًا خارج مكانه ولا يظهر عند التصغير — الآن `lg:hidden` حتى `lg:group-hover:flex` فقط؛ `lg:justify-center` لم يعد يهزم `group-hover:justify-between` بإضافة `lg:group-hover:justify-between`؛ وعرض `lg:w-16` صار يُهزم فعليًا بـ `lg:hover:w-64 / lg:focus-within:w-64` مع تعميم `lg:group-hover` على كل التسميات والعناصر (الموصى به).
- **تحسينات دفع/طلاب/اختبارات:** إصلاح `sessionOffset` المنطقي، تجميع عمليات حفظ نتائج الاختبارات، `listStudentsWithGroups`، نسخ الحقول عبر `data-copyable` مع تحسين قائمة السياق (السماح بالنسخ داخل `data-copyable`)، وتحديث نصوص `payments.cycle` / `students`.
- **رفع الإصدار:** توحيد `0.10.1` عبر `package.json` + `tauri.conf.json` + `Cargo.toml` + `navigation.tsx`.

## v0.9.5

- **إصلاح عدّاد الحصص (8/0 → 8/1 مع لم يدفع)**: الدورة الآن دورية `modulo S` عبر `deriveCycle` في `session-dues.ts` — `8/8` ثم `1/8` مع شارة `لم يدفع` / `×N دورات` للمتأخرين، و `0/8` بعد الدفع حتى أول حضور بعده. حضور يوم الدفع يُحتسب بدقة عبر `createdAt` (حتى نفس اليوم) وعمود الحصص مثبت `dir="ltr"` لمنع قلب `8/1` في RTL. dashboard والجدول يعرضان الشارة الجديدة. لا تغيير في القاعدة.
- **متانة الاستعادة على Windows**: تطبيع مسارات `\`، تأخير وإعادة محاولة `copyFile` بعد `closeDatabase`، ورسائل خطأ أوضح.

## v0.2.0

- **Design-system polish**: every surface tightened into the Nile identity —
  rounded-corner and height standardization across buttons, inputs, selects
  (`h-9`), textareas, cards and the shared components (DataTable,
  CommandPalette, Modal, CollapsibleSection, toasts, popovers, date/month
  pickers); soft shadow surfaces (`--card-shadow`, `--popover-shadow`,
  `--kpi-shadow` with hover lift, `--primary-shadow`); dashboard KPI grid,
  quick-action chips and chart tooltips restyled; the four theme presets
  (nile/warm/midnight/academy × light/dark) audited so every shadow/primary/
  accent token resolves. No schema changes.

## v0.1.7

- **Per-student trend charts (التحليلات)**: the student profile gains a new
  "Trends" section (between the stats grid and the record tables) with four
  recharts cards — stacked monthly attendance bars, an exam-score line chart,
  monthly homework-completion bars, and monthly payment bars. Series come from
  a pure `buildStudentTrends` helper over the already-loaded profile data (no
  new queries); each card falls back to a localized empty state. Money and
  percentages in tooltips are formatted via the shared formatters.

## v0.1.6

- **Student statement of account (كشف الحساب)**: a «كشف الحساب» button in the
  student profile header opens a modal with the monthly summary (due/paid/
  balance + running balance per month since enrollment) and the chronological
  payment ledger. Running balances can go negative when the student pays in
  advance. The statement exports to Excel/PDF through the generic report
  exporters.

## v0.1.5

- **Nile visual identity**: refreshed palette (indigo gradient primary button,
  `--chart-1..5`), Cairo display font for headings, Inter + IBM Plex Sans
  Arabic for body. `Sidebar` and `Header` rebuilt on the new identity with
  grouped nav, active states, a logo badge and a Ctrl K search button.
- **Shared components adopted app-wide**: `DataTable` (generic typed tables
  across every page), `CommandPalette` (Ctrl+K page menu), `Avatar`
  (deterministic-initials), `PageHeader`, `EmptyState`, toasts
  (`src/lib/toast-store.ts`), and `Field` with unified Zod error mapping.
- **Dashboard**: quick-action hero row, prev-month deltas on the
  attendance/collected/expenses/net KPIs, a "new this month" student figure,
  and two 6-month finance trend area charts.
- **Global create actions**: `CommandPalette` and the dashboard quick actions
  open the real create dialogs via a global dialog store
  (`src/lib/dialog-store.ts` + `src/shared/GlobalDialogs.tsx`); saving any of
  them remounts the current page so it re-fetches (`tm:data-changed`).
- **Week navigation**: the timetable `WeekGrid` gained prev/next week buttons,
  a "Today" reset, and a `DD-MM-YYYY` week-range label.
- **Profile edit**: the student profile header gained an «تعديل الطالب» button
  that opens the student form in edit mode.
- Cleanup: `DataTable` lost its unused `stickyHeader` prop.

## v0.1.4

- **Activity log page**: new `/activity` page showing the last 300 recorded
  actions (time, localized action, entity, details) with search and an
  entity-type filter.
- **Debtors on the dashboard**: a 9th KPI «مستحقة الشهر» plus a «أعلى
  المديونين» card listing the top 5 debtors with a link to the payments page.
- **Week-start setting**: Settings now chooses Sunday or Saturday as the first
  day of the week; the timetable grid and date-picker week headers rotate and
  re-anchor dates accordingly.
- **Shared components + polish**: `Modal` (animated, reduced-motion aware),
  `Select`/`Textarea`/`Field` with unified Zod error mapping, `PageHeader`,
  `EmptyState`, `SearchInput`, `Segmented`, and a `useSaveFeedback` hook —
  adopted across all pages and dialogs. The weekly timetable blocks grow with
  content, session deletions show a centered confirm chip, and `CollapsibleSection`
  headers are full-width accessible toggle buttons.
- **Settings**: time format is a segmented 12h/24h control; the theme row shows
  a live Moon/Sun/MonitorCog icon.
- **Reports**: PDF cells with mixed Arabic + numbers now shape in the correct
  direction, and Arabic Excel exports open right-to-left.

## v0.1.3

- **Excused attendance** (معذور): a fourth status in the daily/monthly sheets,
  purple, counted in every attendance rate and report.
- **Group start date** (تاريخ البدء): optional `starts_on` on groups — hidden
  from the daily roster and "today's sessions" until the group begins.
- **Enrollment date** (تاريخ التسجيل): recorded per student (defaults to
  today; legacy rows backfilled from `created_at`) and shown in the profile;
  attendance rosters include a student from their first day/first month.
- **Tighter attendance rosters**: the daily tab lists only today's scheduled
  groups (with a "no sessions today" empty state), and the group-filter branch
  shows active members only.
- **Money display standardized**: amounts render app-wide as Latin digits with
  thousands separators (ج.م / EGP) — dashboard KPIs, expenses, payments
  (dues/paid/remaining, totals, per-group section headers, history), plans,
  and report previews; exported files stay numeric.
- **Defensive fixes**: strict payment-period validation, remaining clamped at
  zero in the payments report, homework submissions rejected for non-members,
  `session_attendance` cleaned up when a student leaves a group, and
  submissions/results pruned when a student's group changes.
- **Date standardization** continued: exported-report timestamps now render
  `DD-MM-YYYY`.
- Removed the weekly session-attendance statistics from the monthly attendance
  view (the per-session sheets on the timetable page are unaffected).

## v0.1.2

- **Date/time display**: screen tables and exported reports now show dates as
  `DD-MM-YYYY`. Timetable/session times respect a new Settings toggle for
  12-hour vs 24-hour display, with localized AM/PM markers.

- **Edit payments & expenses**: pencil buttons in the payments history and
  expenses tables open the record dialogs prefilled in edit mode
  («تعديل الدفعة» / «تعديل المصروف»); saving updates the existing row instead
  of creating a new one. Payments and expenses were the last features missing
  an edit path.

- **About**: new "حول التطبيق" card in settings showing app name, version, and
  the offline-tagline. The sidebar footer now displays the app version instead
  of the internal phase milestone.
- Reports gained **expenses** (flat table with localized categories) and
  **finances** (monthly collected / expenses / net) exporters.
- **Expenses tracking** (المصروفات): per-month record/delete with fixed
  categories, plus dashboard KPIs for monthly expenses and net balance.
- Weekly timetable polish (Phase 15): homework, exams, and payments grouped
  into collapsible per-group sections; the group form edits recurring sessions
  directly; payments grouped per group.
- Weekly timetable (Phase 14): recurring `group_sessions`, `/schedule` grid,
  dashboard "today's sessions", per-session attendance sheets.
- Packaging polish: modal animations + reduced-motion, a11y labels, font
  subsetting, CSP, and Linux installers (.deb / .rpm / .AppImage).
- Backup/restore, settings, and DB export (Phase 12).
- Dashboard analytics, charts, and KPIs (Phase 11).
- Reports with PDF + Excel exports (Phase 10).
- Skills, weak points, and per-student analytics (Phase 9).
- Exams with grades and avg/high/low (Phase 8).
- Homework assign/submit with completion % (Phase 7).
- Payments: subscription, paid/remaining/due, history (Phase 6).
- Study groups (الفرق): CRUD, members, group-scoped attendance (Phase 5).
- Attendance: daily/monthly, percentage, late (Phase 4).
- Students: CRUD, validation, search, filters, profile, parents (Phase 3).
- Full normalized schema (13 tables), migration, repository layer, activity
  log (Phase 2).
- Layout: sidebar, header, routing, theme + language switchers (Phase 1).
