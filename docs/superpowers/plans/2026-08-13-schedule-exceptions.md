# Plan: Phase 36 — Schedule Exceptions (cancel + move occurrences)

## Goal
Let the teacher open a single day's occurrence of a recurring weekly session and
either **cancel** it (that date only) or **move** it to a different time/room
(same date only). Cancelled occurrences drop out of the daily attendance roster
and the dashboard's "today's sessions" card. Moved occurrences render at their
effective time with a badge. All occurrences stay visible so they can be
restored.

## Key design decisions
- New `session_exceptions` table (one row per session+date, `unique (sessionId, date)`):
  `id`, `session_id` (FK `group_sessions`), `date` `"YYYY-MM-DD"`, `type`
  (`cancelled` | `moved`), `start_time`, `end_time`, `room` (only set when
  `type = moved`), `created_at`/`updated_at`.
- **Same-date moves only** (`ponytail:` cross-day moves are out of scope — the
  grid is a weekly recurring view and the day column is the atomic unit).
- SQLite FKs are off → cleanup in code: `clearForSession` and `clearForGroup` in
  `schedule-repo.ts` must also delete the session's exceptions.
- **Pure logic** in `schedule/application/schedule-exceptions.ts` (fully unit
  tested, no DB): `applyExceptions(byDay, exceptions, dates)` → effective
  `byDay` where an affected session carries `exception: SessionExceptionFlag`;
  `conflictIds(byDay)` (string-compare overlap, extracted from
  `use-schedule-view` so both raw and effective schedules share one conflict
  rule); `activeGroupIdsForDate(sessions, exceptions, date)` (used by the daily
  roster and today's sessions card).
- Room conflicts for a *moved* occurrence are detected against **effective**
  times inside `WeekGrid` (it computes `conflictIds(effectiveByDay)`). The
  group view (`ScheduleGroupsView`) keeps the raw recurring conflicts.
- UI: `SessionBlock` gains an occurrence action (Ban icon) that opens a new
  `SessionOccurrenceDialog` (cancel / move / restore). A cancelled block is
  greyed with a red badge and a visible restore button; a moved block shows an
  amber badge and its effective time. Badge markup extracted to
  `schedule/ui/exception-badge.tsx` to keep `SessionBlock` ≤150 lines.
- Attendance: cancelled occurrences are excluded in `rosterForDate` (via
  `activeGroupIdsForDate`) and `todaySessions` (dashboard, via optional
  `exceptions` param). `getDaily`'s group-filter branch is unchanged (an
  explicit group filter always shows the group's members).
- Use-cases validate that `date`'s weekday matches `session.dayOfWeek` and that
  a `moved` end is after start. Every write is activity-logged
  (`schedule.exceptionCancelled` / `schedule.exceptionMoved` /
  `schedule.exceptionRestored`).

## Migration
- `session_exceptions` added to `src/lib/db/tables-students.ts` (next to
  `groupSessions`), exported via `src/lib/db/schema.ts`.
- `pnpm db:generate` → `drizzle/0011_*.sql`, then `pnpm db:sync` → copies into
  `src-tauri/migrations/`.
- Add `Migration { version: 12, ... }` to the `migrations()` list in
  `src-tauri/src/lib.rs` (current max is 11).

## Tasks

### Task 1 — Schema + migration + cleanup wiring
1. In `src/lib/db/tables-students.ts` add:
   ```ts
   export const sessionExceptions = sqliteTable(
     "session_exceptions",
     {
       id: id(),
       sessionId: text("session_id").notNull().references(() => groupSessions.id),
       date: text("date").notNull(), // ISO YYYY-MM-DD
       type: text("type", { enum: ["cancelled", "moved"] }).notNull(),
       startTime: text("start_time"),
       endTime: text("end_time"),
       room: text("room"),
       ...timestamps,
     },
     (t) => [
       index("session_exceptions_session").on(t.sessionId),
       uniqueIndex("session_exceptions_session_date").on(t.sessionId, t.date),
     ],
   );
   export type SessionException = typeof sessionExceptions.$inferSelect;
   ```
   (Check the file's existing imports for `index`/`uniqueIndex`/`timestamps`;
   add what's missing.)
2. Export `sessionExceptions` + `SessionException` from `src/lib/db/schema.ts`.
3. `pnpm db:generate && pnpm db:sync`.
4. In `src-tauri/src/lib.rs`, append:
   ```rust
   Migration {
       version: 12,
       description: "session_exceptions",
       sql: include_str!("../migrations/0011_*.sql"),
   },
   ```
   (exact filename from the generated file).
5. `src/features/schedule/infrastructure/schedule-repo.ts`: in
   `clearForSession` and `clearForGroup`, delete `sessionExceptions` rows for
   the session id / the group's session ids before removing the sessions
   (mirror the existing `sessionAttendance` cleanup).
6. `TSC_EXIT=0 pnpm build` (file lengths + tsc + vite). No migration applied to
   the live DB needed for tsc; manual `pnpm tauri dev` run is out of scope.

### Task 2 — Domain schemas (`src/features/schedule/domain.ts`)
Add (reuse existing `timeRegex`; add `dateRegex` if not present):
```ts
export const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const cancelSessionSchema = z.object({
  sessionId: z.string().min(1),
  date: z.string().regex(dateRegex, "invalid date"),
});

export const moveSessionSchema = z
  .object({
    sessionId: z.string().min(1),
    date: z.string().regex(dateRegex, "invalid date"),
    startTime: z.string().regex(timeRegex, "invalid time"),
    endTime: z.string().regex(timeRegex, "invalid time"),
    room: z.string().trim().max(100).optional(),
  })
  .refine((v) => v.endTime > v.startTime, {
    path: ["endTime"],
    message: "end after start",
  });
```
Add `schedule/domain.test.ts` asserting both schemas accept valid input and
reject invalid (wrong date format, wrong time format, end ≤ start).

### Task 3 — Exception repository (`src/features/schedule/infrastructure/exception-repo.ts`)
```ts
import { asc, eq, inArray } from "drizzle-orm";
import { sessionExceptions, type SessionException } from "@/lib/db/schema";
import { createRepository } from "@/lib/db/repository";
import { db } from "@/lib/db/client";

export const exceptionRepository = {
  ...createRepository(sessionExceptions),
  listForDates: async (sessionIds: string[], dates: string[]): Promise<SessionException[]> =>
    db
      .select()
      .from(sessionExceptions)
      .where(and(inArray(sessionExceptions.sessionId, sessionIds), inArray(sessionExceptions.date, dates)))
      .orderBy(asc(sessionExceptions.date)),
  clearForSessions: async (sessionIds: string[]): Promise<void> => {
    if (sessionIds.length === 0) return;
    await db.delete(sessionExceptions).where(inArray(sessionExceptions.sessionId, sessionIds));
  },
};
```
- Add `listForDates` to keep WeekGrid/schedule queries cheap (only the visible
  week + the dashboard/roster dates need exceptions); `list()` (from
  `createRepository`) covers the full dump when needed.
- `clearForSession` on `sessionExceptions` lives in `schedule-repo`'s
  `clearForSession` (Task 1) — do not double-implement.

### Task 4 — Pure logic + tests (`src/features/schedule/application/schedule-exceptions.ts`)
Types + functions (string-time overlap; no dayjs dependency except
`activeGroupIdsForDate` which may import dayjs, matching existing use-cases):
```ts
export interface SessionExceptionFlag {
  id: string;
  type: "cancelled" | "moved";
  date: string;
  startTime: string | null;
  endTime: string | null;
  room: string | null;
}
export type SessionWithException = SessionWithGroup & { exception?: SessionExceptionFlag };

export function applyExceptions(byDay, exceptions, dates): SessionWithException[][] // keyed `${sessionId}|${date}`, dates → ISO
export function conflictIds(byDay): Set<string> // room-based overlap, string compare
export function activeGroupIdsForDate(sessions, exceptions, date): Set<string> // active + starts_on + not cancelled that date
```
Tests (`schedule-exceptions.test.ts`), fixtures use a small `SessionWithGroup`
factory:
- `applyExceptions`: no exceptions → identity; cancelled flags the session and
  keeps position; moved overrides start/end/room and flags it; room-null moved
  keeps original room; other dates/sessions untouched.
- `conflictIds`: non-overlapping same room → none; overlapping same room →
  both ids; same session ids never collide across days; different rooms never
  collide.
- `activeGroupIdsForDate`: inactive group excluded; not-started group excluded;
  cancelled occurrence drops its group; a group with a second non-cancelled
  session that weekday stays.

### Task 5 — Use-cases (`src/features/schedule/application/schedule-exception-cases.ts`)
```ts
export async function cancelOccurrence(sessionId: string, date: string): Promise<void>
export async function moveOccurrence(sessionId: string, date: string, startTime: string, endTime: string, room?: string): Promise<void>
export async function restoreOccurrence(exceptionId: string): Promise<void>
export async function listScheduleExceptions(): Promise<SessionException[]> // newest first
export async function exceptionsForDates(sessionIds: string[], dates: string[]): Promise<SessionException[]>
```
- `cancelOccurrence`/`moveOccurrence`: validate input; load the session
  (`scheduleRepository.findById`) → guard `dayjs(date).day() === session.dayOfWeek`
  (throw localized `"schedule.exceptions.weekdayMismatch"`); upsert by
  `(sessionId, date)` — delete an existing row first, then insert (or use repo
  `update` when id known; simplest: `exceptionRepository.insert` after deleting
  any previous row for the pair). Log `schedule.exceptionCancelled` /
  `schedule.exceptionMoved` with `{ sessionId, date }` (+ times/room).
- `restoreOccurrence`: remove by id; log `schedule.exceptionRestored`.
- No tests (thin DB wrappers, matching `schedule-cases` pattern).

### Task 6 — UI: dialog + WeekGrid/DayColumn/SessionBlock + refactor
1. `src/features/schedule/ui/exception-badge.tsx`: `ExceptionBadge({ type })` —
   red cancelled badge (`Ban` icon), amber moved badge (`ArrowRightLeft` icon).
2. `src/features/schedule/application/` import + refactor
   `src/features/schedule/ui/use-schedule-view.ts`: replace its local conflict
   memo with `conflicts = useMemo(() => conflictIds(byDay), [byDay])` from the
   pure module (same behavior, one source of truth).
3. `src/features/schedule/ui/SessionBlock.tsx`:
   - Props: add `date: string`, `onOccurrence: (session: SessionWithGroup, date: string) => void`.
   - `const ex = session.exception; const cancelled = ex?.type === "cancelled";`
   - Cancelled: block `opacity-70 ring-1 ring-destructive/40`, group name
     `line-through`, `ExceptionBadge type="cancelled"`, and instead of the
     hover action stack show a single visible restore button (Undo icon,
     `aria-label` = `schedule.exceptions.restore`) calling `onOccurrence(session, date)`.
   - Otherwise: hover stack gains the occurrence button (Ban icon,
     `aria-label` = `schedule.exceptions.occurrence`) above edit/delete; moved
     sessions show `ExceptionBadge type="moved"`.
   - Extend the `lines` count for the badge so `minBlockHeight` grows.
4. `src/features/schedule/ui/day-column.tsx`: add `date: string` and
   `onOccurrence` props, thread into `SessionBlock`.
5. `src/features/schedule/ui/WeekGrid.tsx`:
   - Props: add `exceptions: SessionException[]`, `onOccurrence: (session, date: string) => void`; drop the `conflicts` prop.
   - `effectiveByDay = useMemo(() => applyExceptions(byDay, exceptions, dates), [...])`,
     `conflicts = useMemo(() => conflictIds(effectiveByDay), [effectiveByDay])`.
   - Pass each day's ISO date + `onOccurrence` to `DayColumn`.
6. `src/features/schedule/ui/SessionOccurrenceDialog.tsx` (new, ~150 lines):
   - Props: `open`, `session: SessionWithGroup | null`, `date: string`,
     `exception: SessionException | null`, `onClose`, `onSaved`.
   - `Modal` + title = `schedule.exceptions.title`; shows the session's group +
     date (formatted `DD-MM-YYYY`).
   - Existing exception → a confirm card: «استعادة الجلسة» button →
     `restoreOccurrence(exception.id)`.
   - No exception → segmented choice cancel/move (`Button variant="outline"`
     pair). Cancel = single confirm button. Move = `input type="time"` start/end
     prefilled from the session + room `Textarea`? (room is short → `Input`),
     save → `moveOccurrence(...)`. Validate `end > start` client-side via
     `moveSessionSchema.safeParse`.
   - `useSaveFeedback`-style `{ saving, error }`; success → `onSaved()` + close.
7. `src/features/schedule/ui/SchedulePage.tsx`:
   - State `occurrence: { session: SessionWithGroup; date: string } | null` +
     `exceptions: SessionException[]`.
   - `reload()` (Promise.all with schedule/groups) also sets `exceptions` via
     `listScheduleExceptions()`.
   - Render `<WeekGrid exceptions={exceptions} onOccurrence={(s, d) => setOccurrence({ session: s, date: d })} ... />` (remove `conflicts`).
   - Render `<SessionOccurrenceDialog ... exception={occurrence ? exceptions.find((ex) => ex.sessionId === occurrence.session.id && ex.date === occurrence.date) ?? null : null} onSaved={reload} />`.
   - `ScheduleGroupsView` unchanged (raw conflicts prop stays).
8. Verify `pnpm build` (tsc + lengths). WeekGrid/DayColumn/SessionBlock must
   stay ≤150 lines — move anything over to `exception-badge.tsx` or a small
   `week-column.tsx` if needed.

### Task 7 — Attendance + dashboard filtering
1. `src/features/attendance/application/attendance-roster.ts`:
   ```ts
   const exceptions = await exceptionsForDates(schedule.map((s) => s.id), [date]);
   const groupIds = [...activeGroupIdsForDate(schedule, exceptions, date)];
   ```
   (replaces the inline `.filter(...).map(...)`; keeps groupStartsOn/status rules).
2. `src/features/dashboard/application/dashboard-helpers.ts`:
   `todaySessions(sessions, now, exceptions: SessionException[] = [])` —
   filter out sessions whose id is cancelled for today's ISO date. Keep the
   returned shape identical.
3. `src/features/dashboard/application/dashboard-cases.ts`: add
   `listScheduleExceptions()` to the `Promise.all` and pass to `todaySessions`.
4. Tests:
   - Extend `dashboard-helpers.test.ts`: `todaySessions` drops a cancelled
     today occurrence, keeps a moved one, keeps non-today sessions.
   - `activeGroupIdsForDate` already covered in Task 4.

### Task 8 — i18n + docs + full verify
1. `src/lib/i18n/ar/schedule.ts` + `src/lib/i18n/en/schedule.ts`: add
   `exceptions` namespace:
   `occurrence`, `title`, `cancel`, `move`, `restore`, `cancelled`, `moved`,
   `date`, `startTime`, `endTime`, `room`, `confirmCancel`,
   `savedCancelled`, `savedMoved`, `savedRestored`, `weekdayMismatch`,
   `error`, `noSession`. (Arabic: إلغاء جلسة / نقل جلسة / استعادة /
   ملغاة / منقولة / جلسة / اليوم / وقت البدء / وقت الانتهاء / الغرفة /
   تأكيد الإلغاء …). Keys are flat under `schedule.exceptions.*`.
2. Docs: add Phase 36 section to `AGENTS.md` (schema note, table, move/cancel
   semantics, filtering points) and a roadmap entry.
3. Verify: `pnpm test` (all green incl. new tests), `pnpm build`
   (`TSC_EXIT=0`, lengths OK). Commit per task; final message like
   `feat: schedule exceptions (cancel + move occurrences)`.
