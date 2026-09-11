<div align="center">

🇪🇬 [العربية](README.ar.md)

<img src="public/logo.png" alt="Teacher Manager logo" width="120" />

# Teacher Manager

**The offline-first desktop app for private teachers — students, attendance, payments, homework, exams, reports, and analytics in one place.**

[![version](https://img.shields.io/badge/version-0.11.0-blue)](CHANGELOG.md)
[![platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20macOS-lightgrey)](https://github.com/MrMostafaMo/teacher-manager/releases)
[![offline](https://img.shields.io/badge/data-100%25%20offline%20SQLite-green)](#-data--sync)
[![tauri](https://img.shields.io/badge/desktop-Tauri%20v2-orange)](#-tech-stack)
[![react](https://img.shields.io/badge/frontend-React%2019%20%2B%20TypeScript-blue)](#-tech-stack)
[![i18n](https://img.shields.io/badge/i18n-%D8%A7%D9%84%D8%B9%D8%B1%D8%A8%D9%8A%D8%A9%20%7C%20English-purple)](#-language--appearance)

[Features](#-features) · [Screenshots](#-screenshots) · [Download](#-download--install-for-teachers) · [For Developers](#-for-developers) · [Reports & Exports](#-reports--exports) · [Roadmap](docs/roadmap.md) · [Changelog](CHANGELOG.md)

</div>

> **Offline-first.** All data lives in a local SQLite database on your device — the app works with no internet at all. Optional Supabase sync backs up and syncs across devices when you want it.

## ✨ Features

Everything a private teacher needs to run an educational center:

**📊 Main**
- **Dashboard** — 9 KPI tiles (students, attendance, collected, expenses, net, outstanding…), today's sessions, top debtors, finance trend charts, weak skills, prev-month deltas
- **Students** — CRUD with validation, search & filters, enrollment date, parent info, full profile per student
- **Attendance** — daily roster (auto-limited to today's scheduled groups), monthly view, 4 statuses (present / late / absent / excused), mark-all-present, printable roster PDF
- **Study groups** — CRUD with members, optional start date, and a live timetable editor right inside the group form

**💰 Finance**
- **Payments** — monthly dues (unique students counted once), payment history, per-payment receipt PDF, per-student statement of account (كشف الحساب)
- **Expenses** — outgoing costs by category (prizes, stationery, utilities, maintenance, other) with monthly totals and a category donut chart

**📚 Academic**
- **Homework** — assign per group, track submissions, completion %
- **Exams** — create, enter grades, avg / high / low stats
- **Skills & Weak points** — per-student skill scores plus free-text weak points with resolved tracking
- **Schedule** — weekly timetable grid (day/group views, week navigation, room-conflict detection), one-off sessions, single-occurrence cancel / move (same-day or cross-day) with restore

**📈 Insights & System**
- **Student profile** — stats, trend charts (attendance, exams, homework, payments), statement, report card PDF, activity timeline
- **Reports** — students, attendance, exams, payments, expenses, finances + per-student statement; Excel + PDF export with Arabic shaping and RTL sheets
- **Notifications** — persisted center (overdue homework, unpaid dues, schedule changes, weak skills, low attendance) with OS banners
- **Activity log** — every change logged, searchable, with one-click **undo** on all deletes
- **Settings** — 4 theme presets × light/dark, high-contrast mode, 12/24h time, week start, WhatsApp templates, Supabase sync + cloud backup/restore

**⚡ Productivity** — `Ctrl+K` command palette, global create dialogs from anywhere, notifications bell, responsive icon-rail sidebar.

## 📸 Screenshots

> 🚧 Screenshots are being captured — each slot below renders automatically once its file lands in `docs/screenshots/` (PNG, `1280×800` recommended).

| Dashboard | Students |
|---|---|
| <img src="docs/screenshots/dashboard.png" alt="Dashboard — KPIs, today's sessions, finance charts" width="100%" /> | <img src="docs/screenshots/students.png" alt="Students list and student profile" width="100%" /> |

| Attendance | Schedule |
|---|---|
| <img src="docs/screenshots/attendance.png" alt="Daily attendance roster" width="100%" /> | <img src="docs/screenshots/schedule.png" alt="Weekly timetable grid" width="100%" /> |

| Payments | Expenses |
|---|---|
| <img src="docs/screenshots/payments.png" alt="Payments dues and history" width="100%" /> | <img src="docs/screenshots/expenses.png" alt="Expenses table and category chart" width="100%" /> |

| Reports | Settings |
|---|---|
| <img src="docs/screenshots/reports.png" alt="Reports page with preview" width="100%" /> | <img src="docs/screenshots/settings.png" alt="Settings and appearance" width="100%" /> |

## 📥 Download & Install (for teachers)

1. Open [**Releases**](https://github.com/MrMostafaMo/teacher-manager/releases) and download your installer:
   - **Windows** — `.msi` / `.exe` (NSIS)
   - **Linux** — `.deb` / `.rpm` / `.AppImage`
   - **macOS** — `.dmg` (`aarch64` + `x86_64`)
2. Install, launch **Teacher Manager**, and start adding students — no account, no internet needed.
3. Your database lives locally next to the app config; back it up anytime from **Settings → Backup** (local file or Supabase cloud).

## 🛠 For Developers

**Prerequisites:** [Node.js](https://nodejs.org/) (LTS), [pnpm](https://pnpm.io/) `11.21.0`, [Rust](https://www.rust-lang.org/tools/install) (for `tauri dev` / `tauri build`).

```bash
pnpm install          # install dependencies
pnpm dev              # Vite dev server (frontend only)
pnpm tauri dev        # desktop app in dev mode (full stack)
pnpm build            # file-length check + typecheck + production build
pnpm tauri build      # build installers (.deb/.rpm/.AppImage on Linux)
pnpm test             # vitest — all unit tests (jsdom)
```

### Database workflow

The schema source of truth is `src/lib/db/schema.ts`. After changing it:

```bash
pnpm db:generate      # drizzle-kit: emit SQL into drizzle/
pnpm db:sync          # copy + strip migrations into src-tauri/migrations/
```

Then add a `Migration { version: N+1, description, sql }` entry in `src-tauri/src/lib.rs`. Migrations are embedded in the binary and applied automatically on launch.

### Project layout

```
src/
├─ app/            # entry, routes, providers, app shell (Sidebar/Header)
├─ components/ui/  # shadcn primitives
├─ features/       # one folder per feature (students, payments, …)
├─ shared/         # feature-agnostic UI: DataTable, Modal, PageHeader, …
├─ lib/            # db, i18n, theme, settings store, undo, sync, export kit
├─ styles/         # Tailwind v4 theme + presets (nile/warm/midnight/academy)
src-tauri/         # Rust shell, embedded migrations, capabilities
drizzle/           # drizzle-kit migration source
scripts/           # migration sync + file-length guard
docs/              # architecture, roadmap, screenshots
```

Each feature follows `domain.ts` (entities + Zod) → `application/` (use cases) → `infrastructure/` (Drizzle repos) → `ui/` (React). See [`docs/architecture.md`](docs/architecture.md). Conventions (i18n, file-length cap, tests, RTL) live in [`AGENTS.md`](AGENTS.md).

## 💾 Data & Sync

- **Local by default** — SQLite via the Tauri SQL plugin; queries go through Drizzle builders (parameterized, no raw SQL).
- **Backup / restore** — one click in Settings (`VACUUM INTO`; the `.db` file alone is safe to copy).
- **Optional Supabase sync** — email/password auth, row-level last-writer-wins merge, cloud backup/restore. Conflict semantics are documented as last-writer-wins by design.

## 🧾 Reports & Exports

One generic engine exports every report to **Excel** (RTL sheets for Arabic) and **PDF** (Arabic shaping, bidi segmentation) — plus specialty documents: **payment receipts**, **student report cards**, **statements of account**, and **printable attendance rosters**, all saved through the native save dialog.

## 🌍 Language & Appearance

- Default **Arabic (RTL)**, switchable to **English (LTR)** — every string translated, Latin digits (`0123`) in both locales by design.
- 4 theme presets (Nile, Warm, Midnight, Academy) × light/dark, high-contrast toggle, 12/24h clock, week-start choice. Dates display as `DD-MM-YYYY`.

## 🗺 Status

**v0.11.0** — phases 0–46 complete (see [`docs/roadmap.md`](docs/roadmap.md) and [`CHANGELOG.md`](CHANGELOG.md)). Verified before every release: `pnpm build` (file-length + `tsc` + Vite) and `pnpm test`.

## 🤝 Contributing

Issues and pull requests are welcome. Please run `pnpm build` and `pnpm test` before pushing, keep files ≤ 150 lines, and add a `*.test.ts(x)` next to every new unit.

## 👤 Author

**Mostafa Mohamed** — [GitHub](https://github.com/MrMostafaMo/teacher-manager)

Copyright © 2026 Mostafa Mohamed. All rights reserved.
