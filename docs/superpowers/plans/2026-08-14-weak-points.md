# Weak Points Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-student weak-points tracking (description + recorded date + resolved flag) identified on the student profile.

**Architecture:** New `src/features/weak-points/` module (domain → application → infrastructure → ui) + `weak_points` table (migration v14) + profile section/dialog; reuses existing shared components and helpers.

**Tech Stack:** Tauri v2, React 19, TypeScript, Vite, Drizzle (sqlite-proxy), i18next (ar/en), Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-14-weak-points-design.md`

## Global Constraints

- Every source file ≤150 lines (hard 200) — enforced by `pnpm build`
- All UI strings via i18n (ar + en); never hardcode
- Every mutation activity-logged; repos set timestamps; application layer supplies `uuid()`
- Display dates DD-MM-YYYY via `formatDate`; native date inputs ISO; stored dates unix-ms
- All DB queries via Drizzle builders — no raw SQL
- Icon-only buttons need `aria-label`; tests import from `vitest` explicitly

---

### Task 1: Schema table + migration v14

**Files:** Create `src/lib/db/tables-weak-points.ts`; Modify `src/lib/db/schema.ts`, `src-tauri/src/lib.rs`

- [ ] Create `src/lib/db/tables-weak-points.ts` (weakPoints table: id/studentId FK cascade/description/recordedOn/resolved default 0/timestamps/index on studentId; `export type WeakPoint`)
- [ ] Add `export * from "./tables-weak-points";` to `src/lib/db/schema.ts`
- [ ] Run `pnpm db:generate && pnpm db:sync`
- [ ] Add `Migration { version: 14, description: "weak_points", kind: MigrationKind::Up, sql: <verbatim copy of newest src-tauri/migrations/*.sql> }` to `migrations()` in `src-tauri/src/lib.rs`
- [ ] Commit

### Task 2: Shared textSchema helper

**Files:** Modify `src/lib/validation/index.ts`

- [ ] Add `textSchema(max)` = trimmed non-blank string ≤ max; redefine `nameSchema = textSchema(100)`
- [ ] `pnpm test` passes; commit

### Task 3: Domain schema

**Files:** Create `src/features/weak-points/domain.ts`

- [ ] `weakPointInputSchema` = `{ description: textSchema(200), recordedOn: z.number().int().positive(), resolved: z.boolean() }` + `WeakPointInput`; commit

### Task 4: Infrastructure repository

**Files:** Create `src/features/weak-points/infrastructure/weak-point-repo.ts`

- [ ] `weakPointRepository = { ...createRepository(weakPoints), byStudent(studentId) }` — `where(eq(studentId))`, `orderBy(asc(resolved), desc(recordedOn))`; commit

### Task 5: Use-case tests (write first)

**Files:** Create `src/features/weak-points/application/weak-point-cases.test.ts`

- [ ] Mock `weakPointRepository` (insert/update/remove/byStudent via vi.hoisted fns), `@/lib/db/snapshot`, `@/lib/activity-log`; tests: list maps resolved 1→true/0→false; add rejects blank description (ZodError); add stores resolved:1 for true; update throws on missing; remove undo round-trip via `useUndoStore.getState().undo(undoId)`
- [ ] Run suite — expect FAIL (no cases file)

### Task 6: Use cases

**Files:** Create `src/features/weak-points/application/weak-point-cases.ts`

- [ ] `StudentWeakPoint` (Omit<WeakPoint,"resolved"> + boolean resolved), `toView`; `listStudentWeakPoints`, `addWeakPoint(studentId, input)`, `updateWeakPoint(id, input)`, `removeWeakPoint(id, {undo})` — all validate, activity-log (`weakPoint.create/update/delete`, entityType `weakPoint`), delete captures + `registerUndo`
- [ ] `pnpm test` — suite passes; commit

### Task 7: i18n

**Files:** Create `src/lib/i18n/{en,ar}/weak-points.ts`; Modify `src/lib/i18n/{en,ar}/index.ts`, `profile.ts`, `common.ts`

- [ ] `weakPoints` namespace (en + ar): empty/add/edit/description/descriptionPlaceholder/recordedOn/status/active/resolved/markResolved/reopen/save/saving/cancel/delete/confirmDelete/saved/loadError/saveError/deleteError/errors.descriptionRequired
- [ ] Register in both index.ts; `profile.sections.weakPoints` + `profile.manageWeakPoints`; `common.undo.weakPoint` (both locales)
- [ ] `pnpm build` typechecks; commit

### Task 8: Activity log integration

**Files:** Modify `src/lib/activity-log.ts`, `src/features/activity/ui/activity-presentation.ts`, `src/lib/i18n/{ar,en}/activity.ts`

- [ ] `ACTION_KEYS` += weakPoint.create/update/delete; entities += weakPoint; actions += weakPointCreate/Update/Delete (both locales); `ENTITY_ICONS` += `weakPoint: TriangleAlert`
- [ ] Commit

### Task 9: Profile section + test

**Files:** Create `src/features/weak-points/ui/weak-points-section.tsx` + test; Modify `src/features/student-profile/ui/profile-records-b.tsx`

- [ ] `WeakPointsSection({weakPoints, onManage})` — ProfileSection, manage Button (TriangleAlert), empty via ProfileEmpty, badges: destructive active / secondary+line-through+opacity-60 resolved with ` · ${formatDate(recordedOn)}`
- [ ] Re-export from profile-records-b.tsx
- [ ] Test renders both badge kinds + empty state (ThemeProvider + matchMedia polyfill + `i18n.changeLanguage("en")`)
- [ ] `pnpm test` passes; commit

### Task 10: Table

**Files:** Create `src/features/weak-points/ui/weak-points-table.tsx`

- [ ] `WeakPointsTable({rows, deletingId, onEdit, onToggleResolved, onDelete})` — DataTable columns: description / recordedOn (formatDate, dir ltr) / status Badge / actions (CheckCircle2|RotateCcw toggle, Pencil edit, ConfirmDeleteButton; aria-labels)
- [ ] Commit

### Task 11: Form

**Files:** Create `src/features/weak-points/ui/weak-point-form.tsx`

- [ ] `WeakPointFormState {description, date}`, `emptyWeakPointForm()` (dayjs today), `weakPointFormFromRow`, `weakPointInputFromForm` (recordedOn ms, resolved:false), `WeakPointForm({initial, onSave, saving})` — Field+Input+DatePicker, zod parse, mapZodErrors, save button; resets on initial change
- [ ] Commit

### Task 12: Dialog

**Files:** Create `src/features/weak-points/ui/WeakPointsDialog.tsx`

- [ ] Modal (max-w-lg): load via listStudentWeakPoints; form (empty or from editing row); table (toggle-resolve → updateWeakPoint with !resolved; edit → editing; delete → removeWeakPoint + notifyUndo); success: toast(saved), onChanged(), load(); load error inline; delete error toast(error)
- [ ] Commit

### Task 13: Profile wiring

**Files:** Modify `src/features/student-profile/application/student-profile-cases.ts`, `ui/StudentProfilePage.tsx`, `ui/StudentProfilePage.test.tsx`

- [ ] `StudentProfileData.weakPoints` + load via listStudentWeakPoints in Promise.all
- [ ] Page: weakPointsOpen state, WeakPointsSection after SkillsSection, WeakPointsDialog mounted
- [ ] Test buildData += `weakPoints: []`
- [ ] `pnpm test` + `pnpm build` pass; commit

### Task 14: Docs + verification

**Files:** Modify `AGENTS.md`, `docs/roadmap.md` (if phase-listed)

- [ ] Phase 38 paragraph in AGENTS.md Status; roadmap entry if applicable
- [ ] `pnpm test` + `pnpm build` — both pass
- [ ] Commit