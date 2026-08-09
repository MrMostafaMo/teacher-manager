# Changelog

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
