# Notification Center — Design

**Phase 37.** An in-app notification center plus OS-level desktop notifications
for the Teacher Manager app (Tauri v2 + React, offline-first, SQLite).

## Purpose

Surfaces actionable items the teacher should act on — overdue homework, unpaid
dues, cancelled/moved sessions, weak skills, and low attendance — without
requiring a visit to each feature page. Items are derived from data the feature
pages already produce, so the center can never disagree with the pages.

## Sources and generation rules

All items are computed by the pure function `buildNotificationItems(...)` in
`src/features/notifications/application/`. It takes the outputs of five existing
use-cases plus `now` and returns `NotificationItem[]`:

| Source | Filter | Dedup key | details JSON |
| --- | --- | --- | --- |
| `listHomeworks()` | `h.overdue` | `homework:{id}` | `{ title, dueDate, pending, groupName }` |
| `monthlyDues(month)` | `r.remaining > 0` | `payment:{studentId}:{month}` | `{ name, remaining, period }` |
| `listScheduleExceptions()` | `date >= today` | `exception:{id}` | `{ sessionId, date, type }` |
| `listSkills()` | `s.weakCount > 0` | `weak:{skillId}` | `{ name, count }` |
| `getMonthly(month)` | `0 < marked` and `rate < 0.70` | `attendance:{studentId}:{month}` | `{ name, rate, absent }` |

- `month` is the current ISO month (`YYYY-MM`); `rate = (present + late +
  excused) / marked` — the same formula the dashboard uses.
- An item's `type` maps 1:1 to its source; the `key` is what makes it unique
  and comparable across regenerations.
- Only *upcoming* exceptions notify (an exception whose `date` is before today
  is stale and never generated).

## Storage

New `notifications` table (migration v13), registered in
`src/lib/db/tables-students.ts` and the lib.rs migrations list:

| column | type | notes |
| --- | --- | --- |
| `id` | text PK | uuid |
| `type` | text | one of the five source types |
| `key` | text UNIQUE | dedup/suppression identity |
| `details` | text | JSON string of the details object above |
| `read` | integer 0/1 | default 0 |
| `dismissed` | integer 0/1 | default 0 |
| `created_at` / `updated_at` | integer | unix-ms, set by the repository |

Repository: `src/features/notifications/infrastructure/notification-repo.ts`
(plain Drizzle via the sqlite-proxy executor, same pattern as the other
feature repos) — `listActive` (not dismissed, newest first), `listAll`,
`markRead(id)`, `markAllRead()`, `dismiss(id)`, `dismissAll()`,
`insert(row)`, `remove(id)`. The trim cap is applied in the use-case from
`listAll()`.

## Refresh lifecycle

`refreshNotifications()` use-case in
`src/features/notifications/application/notification-cases.ts`:

1. Load the five source arrays in parallel (reusing the feature use-cases).
2. `buildNotificationItems(...)` → desired set.
3. Merge with stored rows:
   - key not stored → `insert` (new item, unread, not dismissed);
   - key stored and still desired → keep (preserve `read`/`dismissed`);
   - key stored but no longer desired → `remove` (resolved automatically).
4. Trim to the newest 100 rows: list all, then remove the oldest rows beyond
   the newest 100 (dismissed or read ones first).
5. Return the newly inserted items so callers can fire system notifications.

Call sites:
- App shell mount (`AppLayout` `useEffect`).
- After the existing `tm:data-changed` event (already dispatched on save).
- When the bell popover opens (cheap background refresh).

The refresh is idempotent: `read`/`dismissed` survive regeneration; items the
user dismissed reappear only if the underlying condition is still true and a
new key appears (e.g., a *new* overdue homework).

## In-app UI

- **Bell button** in the Header (`src/app/...` Header component): bell icon,
  unread-count badge (hidden when 0), `aria-label` + tooltip, opens the popover.
- **Popover**: newest first, one row per active (non-dismissed) notification.
  Row = type icon + localized text (template per `type` interpolating
  `details`) + relative time + unread dot.
  - Click row → mark read + navigate to the relevant route
    (`homework` → `/homework`, `payment` → `/payments`,
    `exception` → `/schedule`, `weak_skill` → `/skills`,
    `low_attendance` → `/attendance`).
  - Per-row dismiss button (icon, `aria-label`).
  - Footer: «Mark all read» and «Dismiss all».
  - Empty state: «No notifications».
- Localized text is rendered from `type` + `details` via a new
  `notifications.*` i18n namespace (en + ar) — no localized strings stored in
  the DB.

## System notifications

- Add `tauri-plugin-notification` (Cargo) + `@tauri-apps/plugin-notification`
  (npm). Register the plugin in `src-tauri/src/lib.rs`; add
  `notification:default` to `src-tauri/capabilities/default.json`.
- `notifySystem(items)` fires an OS banner per newly-inserted item, guarded by
  an `isTauri()` helper (`"__TAURI_INTERNALS__" in window`) so the Vite dev
  server and jsdom tests are safe. Title = localized type title; body = the
  row's localized text.
- Requires one full `pnpm tauri build` for verification.

## Error handling

- Refresh failures are non-fatal: log to console, leave existing rows intact.
- Missing/absent `details` fields render a safe fallback («—»).
- Navigation from a row to a route the item type implies is best-effort.

## Testing

- `buildNotificationItems` (pure): each source, boundaries (rate exactly 70%,
  marked 0, exception date === today vs yesterday), key uniqueness.
- Merge helper (`mergeItems(existing, desired)`): new/keep/resolved, preserves
  flags, trim cap.
- Notification repo with the fake sqlite-proxy executor.
- UI: bell badge count; popover renders items + empty state; dismiss clears a
  row. (Modal/popover internals verified in jsdom; system notifications are
  the Tauri rebuild's E2E.)
- Verification: `pnpm test`, `pnpm tsc --noEmit`, `pnpm build`, and one full
  `pnpm tauri build`. Every file ≤150 lines (soft).

## Out of scope

- Per-source notification settings / mute controls.
- Reminders scheduled at specific times (e.g., "session in 30 minutes").
- Configurable low-attendance threshold (fixed 70%).
- Sound/vibration on system notifications.
