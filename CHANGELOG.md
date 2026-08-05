# Changelog

## v0.1.2

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
