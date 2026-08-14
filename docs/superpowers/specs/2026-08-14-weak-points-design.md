# Weak Points Tracking — Design

**Date:** 2026-08-14
**Status:** Approved

## Goal

Record, store, and identify specific points of weakness for each student, so
the teacher can know what each student is struggling with.

## Scope

- Per-student weakness entries: required free-text description, recorded date
  (unix-ms, user-editable, defaults to today), resolved flag (mark fixed later).
- Identified on the **student profile page only** (no dashboard card, no
  notifications, no reports, no students-list column).
- Standalone feature — the existing skills catalog (levels 1–5, ≤2 = weak)
  stays untouched.
- No extra features beyond the above.

## Data model (migration v14)

New `weak_points` table (`src/lib/db/tables-weak-points.ts`, exported from
`schema.ts`):

- `id` uuid PK
- `student_id` FK → `students.id`, `onDelete: cascade`
- `description` text NOT NULL (trimmed, 1–200 chars)
- `recorded_on` integer NOT NULL (unix-ms)
- `resolved` integer NOT NULL default 0 (0/1)
- `created_at` / `updated_at` (unix-ms, set by repositories)
- index on `student_id`

DB workflow: `pnpm db:generate && pnpm db:sync`, then
`Migration { version: 14, ... }` in `src-tauri/src/lib.rs`.

## Feature module — `src/features/weak-points/`

Standard split (domain / application / infrastructure / ui), every file ≤150
lines.

- **domain.ts** — `weakPointInputSchema` (description via shared `textSchema(200)`,
  recordedOn positive int, resolved boolean).
- **application/weak-point-cases.ts** — `listStudentWeakPoints` (unresolved
  first, then newest recorded), `addWeakPoint`, `updateWeakPoint`,
  `removeWeakPoint` (undo + activity log). DB `resolved` 0/1 normalized to
  boolean in `StudentWeakPoint`.
- **infrastructure/weak-point-repo.ts** — `createRepository(weakPoints)` +
  `byStudent(studentId)` ordered `asc(resolved), desc(recordedOn)`.
- **ui/** — `WeakPointsSection` (profile badges: active = destructive, resolved
  = muted/struck + date; empty state; manage button), `WeakPointsDialog`
  (modal: add/edit form + `DataTable` of entries with resolve toggle, edit,
  two-click-confirm delete), `weak-points-table.tsx`, `weak-point-form.tsx`.

## Cross-cutting (reuse — no new infra)

- Activity log: `weakPoint.create/update/delete` + `ACTION_KEYS` + i18n labels
  + `ENTITY_ICONS` (`TriangleAlert`). Profile activity scoping works via
  `details.studentId`.
- i18n: `weakPoints.*` namespace (ar + en) + `profile.sections.weakPoints`,
  `profile.manageWeakPoints`, `common.undo.weakPoint`.
- Reuse: `createRepository`, `Modal`, `Field`, `mapZodErrors`, `DataTable`,
  `ConfirmDeleteButton`, `useConfirmDelete`-free (table uses ConfirmDeleteButton),
  `DatePicker`, `formatDate` (DD-MM-YYYY), `notifyUndo`, `toast`, shared zod
  helpers. New shared helper: `textSchema(max)` in `src/lib/validation`
  (`nameSchema` redefined on top of it — DRY, no behavior change).

## Verification

Unit tests: `weak-point-cases.test.ts` (mocked repo — list mapping, validation
rejection, resolved normalization, update-throw, delete undo round-trip),
`weak-points-section.test.tsx` (render badges/empty under i18n+theme).
Full suite `pnpm test` + `pnpm build` (file-length guard) must pass.