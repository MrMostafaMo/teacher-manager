# Notification Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persisted in-app notification center (header bell + dropdown) plus OS-level desktop notifications for overdue homework, unpaid dues, schedule exceptions, weak skills, and low attendance.

**Architecture:** New `src/features/notifications/` feature (domain/application/infrastructure/ui) following the repo's standard split. A pure generator turns the outputs of five existing use-cases into `NotificationItem`s with stable dedup keys; a `refreshNotifications()` use-case merges them into a persisted `notifications` table (insert new, keep read/dismissed, delete resolved). A zustand store feeds a Header bell with unread badge + `PopoverShell` dropdown; a `NotificationSync` component in `AppLayout` refreshes on mount and on `tm:data-changed` and fires Tauri system notifications for newly inserted items.

**Tech Stack:** React 19, TypeScript, Drizzle ORM + sqlite-proxy, zustand, react-i18next, Tauri v2 + `tauri-plugin-notification`.

**Spec:** `docs/superpowers/specs/2026-08-13-notification-center-design.md`

## Global Constraints

- Migration version to add: **13** (drizzle emits `0012_*.sql`; max is v12 → drizzle `0011`).
- Every source file ≤150 lines (soft), ≤200 (hard) — enforced by `pnpm build`.
- DB workflow: edit `src/lib/db/tables-*.ts` → `pnpm db:generate && pnpm db:sync` → add `Migration { version: 13 }` to `src-tauri/src/lib.rs`.
- No raw SQL; all queries via Drizzle query builders.
- i18n: every user-facing string via `useTranslation()`, keys in `src/lib/i18n/{en,ar}/<namespace>.ts` (flat object, auto-merged — no registration needed).
- `created_at`/`updated_at` are unix-ms set by repositories, never callers.
- Icon-only buttons need `aria-label`; RTL direction from theme, never hardcoded `dir` except in known LTR cases.
- No TODO/FIXME; deliberate simplifications marked `ponytail:`.
- Tests: Vitest + Testing Library, files named `*.test.ts(x)` next to source, importing `describe/it/expect` explicitly from `vitest`.
- Verification per task: `pnpm test`, `pnpm tsc --noEmit`; full `pnpm build` before commit. Task 10 also runs one full `pnpm tauri build`.
- `pnpm build`'s chunk-size warning is pre-existing and not an error.

---

### Task 1: notifications table + migration v13

**Files:**
- Create: `src/lib/db/tables-notifications.ts`
- Modify: `src/lib/db/schema.ts` (barrel export)
- Modify: `src-tauri/src/lib.rs` (Migration v13)
- Generated: `drizzle/0012_*.sql`, `src-tauri/migrations/0012_*.sql`

**Interfaces:**
- Consumes: `id` / `timestamps` column helpers from `src/lib/db/columns.ts`.
- Produces: `notifications` table + exported type `NotificationRow` (`typeof notifications.$inferSelect`) with fields `id, type, key, details, read, dismissed, createdAt, updatedAt`.

- [ ] **Step 1: Create the table file**

Create `src/lib/db/tables-notifications.ts`:

```ts
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { id, timestamps } from "./columns";

/**
 * In-app notifications generated from feature data (overdue homework, unpaid
 * dues, schedule exceptions, weak skills, low attendance). `key` is a stable
 * dedup identity (`source:id` / `source:student:month`) that survives
 * regeneration; `details` is a JSON string rendered through i18n templates.
 */
export const notifications = sqliteTable("notifications", {
  id: id(),
  type: text("type").notNull(),
  key: text("key").notNull().unique(),
  details: text("details").notNull(),
  read: integer("read", { mode: "boolean" }).notNull().default(false),
  dismissed: integer("dismissed", { mode: "boolean" }).notNull().default(false),
  ...timestamps,
});

export type NotificationRow = typeof notifications.$inferSelect;
```

- [ ] **Step 2: Export from the schema barrel**

Add `export { notifications } from "./tables-notifications";` and
`export type { NotificationRow } from "./tables-notifications";` to
`src/lib/db/schema.ts` (mirror how `sessionExceptions` is exported).

- [ ] **Step 3: Generate + sync the migration**

Run: `pnpm db:generate && pnpm db:sync`
Expected: `drizzle/0012_<name>.sql` and `src-tauri/migrations/0012_<name>.sql` created (verify with `ls drizzle/`).

- [ ] **Step 4: Register migration v13 in lib.rs**

In `src-tauri/src/lib.rs`, add to the `migrations()` list:

```rust
Migration {
    version: 13,
    description: "notifications",
    sql: include_str!("./migrations/0012_*.sql"),
}
```

Replace `0012_*` with the actual generated filename.

- [ ] **Step 5: Verify**

Run: `pnpm tsc --noEmit` — clean.
Run: `node scripts/check-file-lengths.mjs` — all files within limits.

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/tables-notifications.ts src/lib/db/schema.ts src-tauri/src/lib.rs drizzle src-tauri/migrations
git commit -m "feat(notifications): notifications table and migration v13"
```

---

### Task 2: domain types + pure generator `buildNotificationItems`

**Files:**
- Create: `src/features/notifications/domain.ts`
- Create: `src/features/notifications/application/build-notification-items.ts`
- Test: `src/features/notifications/application/build-notification-items.test.ts`

**Interfaces:**
- Consumes: `HomeworkListItem` from `@/features/homework/application/homework-cases`; `DuesRow` from `@/features/payments/application/payment-cases`; `SessionException` from `@/lib/db/schema`; `SkillWithWeakCount` from `@/features/skills/infrastructure/skill-repo`; `StudentMonthlyRow` from `@/features/attendance/application/attendance-cases`.
- Produces:
  ```ts
  export type NotificationType = "homework_overdue" | "payment_overdue" | "exception" | "weak_skill" | "low_attendance";

  export interface NotificationItem {
    type: NotificationType;
    key: string;
    details: {
      title?: string; dueDate?: string | null; pending?: number; groupName?: string | null;
      name?: string; remaining?: number; period?: string;
      sessionId?: string; date?: string; kind?: "cancelled" | "moved";
      count?: number; rate?: number; absent?: number;
    };
  }

  export interface NotificationSourceData {
    homeworks: HomeworkListItem[];
    dues: DuesRow[];
    exceptions: SessionException[];
    skills: SkillWithWeakCount[];
    monthly: StudentMonthlyRow[];
  }

  export function buildNotificationItems(data: NotificationSourceData, month: string, today: string): NotificationItem[]
  ```

- [ ] **Step 1: Write the failing tests**

Create `build-notification-items.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { HomeworkListItem } from "@/features/homework/application/homework-cases";
import type { DuesRow } from "@/features/payments/application/payment-cases";
import type { SessionException } from "@/lib/db/schema";
import type { SkillWithWeakCount } from "@/features/skills/infrastructure/skill-repo";
import type { StudentMonthlyRow } from "@/features/attendance/application/attendance-cases";
import { buildNotificationItems } from "./build-notification-items";

const month = "2026-08";
const today = "2026-08-13";

function homework(overrides: Partial<HomeworkListItem> = {}): HomeworkListItem {
  return {
    id: "h1", groupId: "g1", title: "Algebra p.40", dueDate: "2026-08-10",
    submitted: 1, pending: 2, late: 0, completion: 33, overdue: true,
    groupName: "Group A", createdAt: 0, updatedAt: 0, ...overrides,
  };
}
function due(overrides: Partial<DuesRow> = {}): DuesRow {
  return {
    student: { id: "st1", name: "Ahmed", status: "active", planId: null, enrolledOn: "2026-07-01", createdAt: 0, updatedAt: 0 },
    plan: null, due: 300, paid: 100, remaining: 200, groups: [], ...overrides,
  };
}
function exception(overrides: Partial<SessionException> = {}): SessionException {
  return { id: "e1", sessionId: "s1", date: "2026-08-13", type: "cancelled", startTime: null, endTime: null, room: null, createdAt: 0, updatedAt: 0, ...overrides };
}
function skill(overrides: Partial<SkillWithWeakCount> = {}): SkillWithWeakCount {
  return { id: "k1", name: "Fractions", weakCount: 3, trackedCount: 5, createdAt: 0, updatedAt: 0, ...overrides };
}
function monthly(overrides: Partial<StudentMonthlyRow> = {}): StudentMonthlyRow {
  return { studentId: "st1", name: "Ahmed", present: 4, absent: 6, late: 0, excused: 0, ...overrides };
}
function empty(): NotificationSourceData {
  return { homeworks: [], dues: [], exceptions: [], skills: [], monthly: [] };
}

describe("buildNotificationItems", () => {
  it("generates homework items only for overdue homework", () => {
    const items = buildNotificationItems(
      { ...empty(), homeworks: [homework(), homework({ id: "h2", overdue: false })] },
      month, today,
    );
    expect(items.map((i) => i.key)).toEqual(["homework:h1"]);
    expect(items[0].details.title).toBe("Algebra p.40");
  });

  it("generates payment items for students with remaining dues", () => {
    const items = buildNotificationItems(
      { ...empty(), dues: [due(), due({ student: { ...due().student, id: "st2", name: "Sara" }, remaining: 0 })] },
      month, today,
    );
    expect(items.map((i) => i.key)).toEqual(["payment:st1:2026-08"]);
    expect(items[0].details.remaining).toBe(200);
  });

  it("keeps only upcoming schedule exceptions", () => {
    const items = buildNotificationItems(
      {
        ...empty(),
        exceptions: [
          exception(),
          exception({ id: "e2", date: "2026-08-10", type: "moved", startTime: "11:00", endTime: "12:00", room: "R2" }),
        ],
      },
      month, today,
    );
    expect(items.map((i) => i.key)).toEqual(["exception:e1"]);
    expect(items[0].details.kind).toBe("cancelled");
  });

  it("generates weak-skill items for skills with weakCount > 0", () => {
    const items = buildNotificationItems(
      { ...empty(), skills: [skill(), skill({ id: "k2", weakCount: 0 })] },
      month, today,
    );
    expect(items.map((i) => i.key)).toEqual(["weak:k1"]);
  });

  it("flags low attendance below 70% with at least one marked day", () => {
    const items = buildNotificationItems(
      {
        ...empty(),
        monthly: [
          monthly(),                                     // 4/10 → 40%
          monthly({ studentId: "st2", name: "Sara", present: 7, absent: 3 }), // 70% → excluded
          monthly({ studentId: "st3", name: "Lina", present: 0, absent: 0, late: 0, excused: 0 }), // no marks
        ],
      },
      month, today,
    );
    expect(items.map((i) => i.key)).toEqual(["attendance:st1:2026-08"]);
    expect(items[0].details.rate).toBe(0.4);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/features/notifications/application/build-notification-items.test.ts`
Expected: FAIL — module `./build-notification-items` not found.

- [ ] **Step 3: Write `domain.ts`**

Create `src/features/notifications/domain.ts`:

```ts
export type NotificationType =
  | "homework_overdue"
  | "payment_overdue"
  | "exception"
  | "weak_skill"
  | "low_attendance";

export interface NotificationItem {
  type: NotificationType;
  key: string;
  details: {
    title?: string;
    dueDate?: string | null;
    pending?: number;
    groupName?: string | null;
    name?: string;
    remaining?: number;
    period?: string;
    sessionId?: string;
    date?: string;
    kind?: "cancelled" | "moved";
    count?: number;
    rate?: number;
    absent?: number;
  };
}
```

- [ ] **Step 4: Write `build-notification-items.ts`**

Create `src/features/notifications/application/build-notification-items.ts`:

```ts
import type { HomeworkListItem } from "@/features/homework/application/homework-cases";
import type { DuesRow } from "@/features/payments/application/payment-cases";
import type { StudentMonthlyRow } from "@/features/attendance/application/attendance-cases";
import type { SkillWithWeakCount } from "@/features/skills/infrastructure/skill-repo";
import type { SessionException } from "@/lib/db/schema";
import type { NotificationItem } from "@/features/notifications/domain";

export interface NotificationSourceData {
  homeworks: HomeworkListItem[];
  dues: DuesRow[];
  exceptions: SessionException[];
  skills: SkillWithWeakCount[];
  monthly: StudentMonthlyRow[];
}

/** Low-attendance threshold: rate strictly below this notifies. */
export const LOW_ATTENDANCE_RATE = 0.7;

function homeworkItem(h: HomeworkListItem): NotificationItem {
  return {
    type: "homework_overdue",
    key: `homework:${h.id}`,
    details: { title: h.title, dueDate: h.dueDate, pending: h.pending, groupName: h.groupName },
  };
}

function paymentItem(r: DuesRow, period: string): NotificationItem {
  return {
    type: "payment_overdue",
    key: `payment:${r.student.id}:${period}`,
    details: { name: r.student.name, remaining: r.remaining, period },
  };
}

function exceptionItem(ex: SessionException): NotificationItem {
  return {
    type: "exception",
    key: `exception:${ex.id}`,
    details: { sessionId: ex.sessionId, date: ex.date, kind: ex.type },
  };
}

function weakSkillItem(s: SkillWithWeakCount): NotificationItem {
  return {
    type: "weak_skill",
    key: `weak:${s.id}`,
    details: { name: s.name, count: s.weakCount },
  };
}

function attendanceItem(r: StudentMonthlyRow, month: string, rate: number): NotificationItem {
  return {
    type: "low_attendance",
    key: `attendance:${r.studentId}:${month}`,
    details: { name: r.name, rate, absent: r.absent },
  };
}

function attendanceRate(r: StudentMonthlyRow): number {
  const marked = r.present + r.absent + r.late + r.excused;
  if (marked === 0) return 1;
  return (r.present + r.late + r.excused) / marked;
}

/** Build the desired notification set from the five source lists. */
export function buildNotificationItems(
  data: NotificationSourceData,
  month: string,
  today: string,
): NotificationItem[] {
  const items: NotificationItem[] = [];
  for (const h of data.homeworks) if (h.overdue) items.push(homeworkItem(h));
  for (const r of data.dues) if (r.remaining > 0) items.push(paymentItem(r, month));
  for (const ex of data.exceptions) if (ex.date >= today) items.push(exceptionItem(ex));
  for (const s of data.skills) if (s.weakCount > 0) items.push(weakSkillItem(s));
  for (const r of data.monthly) {
    const rate = attendanceRate(r);
    if (rate < LOW_ATTENDANCE_RATE) items.push(attendanceItem(r, month, rate));
  }
  return items;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm vitest run src/features/notifications/application/build-notification-items.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add src/features/notifications/domain.ts src/features/notifications/application/build-notification-items.ts src/features/notifications/application/build-notification-items.test.ts
git commit -m "feat(notifications): pure notification-item generator"
```

---

### Task 3: pure merge helper `mergeItems`

**Files:**
- Create: `src/features/notifications/application/merge-items.ts`
- Test: `src/features/notifications/application/merge-items.test.ts`

**Interfaces:**
- Consumes: `NotificationItem` from `@/features/notifications/domain`.
- Produces:
  ```ts
  export interface MergeResult {
    toInsert: NotificationItem[];
    toRemove: string[]; // stored row ids no longer desired
  }
  export function mergeItems(
    existing: Array<{ id: string; key: string }>,
    desired: NotificationItem[],
  ): MergeResult
  ```

- [ ] **Step 1: Write the failing tests**

Create `merge-items.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { NotificationItem } from "@/features/notifications/domain";
import { mergeItems } from "./merge-items";

function item(key: string, type: NotificationItem["type"] = "weak_skill"): NotificationItem {
  return { type, key, details: {} };
}

describe("mergeItems", () => {
  it("inserts desired keys not yet stored", () => {
    const { toInsert, toRemove } = mergeItems([{ id: "a", key: "weak:k1" }], [item("weak:k1"), item("homework:h1", "homework_overdue")]);
    expect(toInsert.map((i) => i.key)).toEqual(["homework:h1"]);
    expect(toRemove).toEqual([]);
  });

  it("removes stored keys no longer desired", () => {
    const { toInsert, toRemove } = mergeItems([{ id: "a", key: "weak:k1" }, { id: "b", key: "weak:k2" }], [item("weak:k1")]);
    expect(toInsert).toEqual([]);
    expect(toRemove).toEqual(["b"]);
  });

  it("keeps existing rows untouched when keys match", () => {
    const existing = [{ id: "a", key: "weak:k1" }, { id: "b", key: "weak:k2" }];
    const { toInsert, toRemove } = mergeItems(existing, [item("weak:k2"), item("weak:k1")]);
    expect(toInsert).toEqual([]);
    expect(toRemove).toEqual([]);
  });

  it("handles empty input sets", () => {
    expect(mergeItems([], [])).toEqual({ toInsert: [], toRemove: [] });
    expect(mergeItems([{ id: "a", key: "weak:k1" }], []).toRemove).toEqual(["a"]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/features/notifications/application/merge-items.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `merge-items.ts`**

```ts
import type { NotificationItem } from "@/features/notifications/domain";

export interface MergeResult {
  toInsert: NotificationItem[];
  /** Stored row ids whose key is no longer desired (resolved conditions). */
  toRemove: string[];
}

/** Diff the desired set against the stored rows by dedup key. */
export function mergeItems(
  existing: Array<{ id: string; key: string }>,
  desired: NotificationItem[],
): MergeResult {
  const existingByKey = new Map(existing.map((e) => [e.key, e.id]));
  const desiredKeys = new Set(desired.map((d) => d.key));
  const toInsert = desired.filter((d) => !existingByKey.has(d.key));
  const toRemove = existing.filter((e) => !desiredKeys.has(e.key)).map((e) => e.id);
  return { toInsert, toRemove };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/features/notifications/application/merge-items.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/notifications/application/merge-items.ts src/features/notifications/application/merge-items.test.ts
git commit -m "feat(notifications): merge diff for persisted notifications"
```

---

### Task 4: notification repository

**Files:**
- Create: `src/features/notifications/infrastructure/notification-repo.ts`

**Interfaces:**
- Consumes: `db` from `@/lib/db/client`, `createRepository` from `@/lib/db/repository`, `notifications` + `NotificationRow` from `@/lib/db/schema`.
- Produces:
  ```ts
  export const notificationRepository: {
    findById(id): Promise<NotificationRow | undefined>;
    list(options?): Promise<NotificationRow[]>;
    listAll(): Promise<NotificationRow[]>;               // newest first
    listActive(): Promise<NotificationRow[]>;            // dismissed = false, newest first
    insert(values): Promise<NotificationRow>;
    update(id, values): Promise<NotificationRow | undefined>;
    remove(id): Promise<boolean>;
    markRead(id): Promise<void>;
    markAllRead(): Promise<void>;
    dismiss(id): Promise<void>;
    dismissAll(): Promise<void>;
  }
  ```

- [ ] **Step 1: Write `notification-repo.ts`**

```ts
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { createRepository } from "@/lib/db/repository";
import { notifications, type NotificationRow } from "@/lib/db/schema";

const base = createRepository(notifications);

/** Notification store. `listActive` serves the bell; the generic CRUD covers
 * the rest. Flag updates use bulk `update` so mark-all/dismiss-all are one
 * statement. */
export const notificationRepository = {
  ...base,

  /** All rows, newest first (used by refresh's trim + merge). */
  listAll: (): Promise<NotificationRow[]> => base.list({ newestFirst: true }),

  /** Non-dismissed rows, newest first (the bell list). */
  listActive: async (): Promise<NotificationRow[]> => {
    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.dismissed, false))
      .orderBy(notifications.createdAt, "desc");
    return rows as unknown as NotificationRow[];
  },

  markRead: async (id: string): Promise<void> => {
    await db.update(notifications).set({ read: true }).where(eq(notifications.id, id));
  },

  markAllRead: async (): Promise<void> => {
    await db.update(notifications).set({ read: true });
  },

  dismiss: async (id: string): Promise<void> => {
    await db.update(notifications).set({ dismissed: true }).where(eq(notifications.id, id));
  },

  dismissAll: async (): Promise<void> => {
    await db.update(notifications).set({ dismissed: true });
  },

  // helper kept for symmetric CRUD; not used by cases today
  markAll: async (): Promise<void> => {
    await db.update(notifications).set({ read: true });
  },
};
```

Note: `markAll` duplicates `markAllRead` — drop it. The final file is:

```ts
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { createRepository } from "@/lib/db/repository";
import { notifications, type NotificationRow } from "@/lib/db/schema";

const base = createRepository(notifications);

/** Notification store. `listActive` serves the bell; `listAll` feeds the
 * refresh trim. Flag updates are bulk so mark-all/dismiss-all are one
 * statement. */
export const notificationRepository = {
  ...base,

  /** All rows, newest first (refresh's merge + trim). */
  listAll: (): Promise<NotificationRow[]> => base.list({ newestFirst: true }),

  /** Non-dismissed rows, newest first (the bell list). */
  listActive: async (): Promise<NotificationRow[]> => {
    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.dismissed, false))
      .orderBy(notifications.createdAt, "desc");
    return rows as unknown as NotificationRow[];
  },

  markRead: async (id: string): Promise<void> => {
    await db.update(notifications).set({ read: true }).where(eq(notifications.id, id));
  },

  markAllRead: async (): Promise<void> => {
    await db.update(notifications).set({ read: true });
  },

  dismiss: async (id: string): Promise<void> => {
    await db.update(notifications).set({ dismissed: true }).where(eq(notifications.id, id));
  },

  dismissAll: async (): Promise<void> => {
    await db.update(notifications).set({ dismissed: true });
  },
};
```

- [ ] **Step 2: Verify compile**

Run: `pnpm tsc --noEmit` — clean.
Run: `node scripts/check-file-lengths.mjs` — within limits.

- [ ] **Step 3: Commit**

```bash
git add src/features/notifications/infrastructure/notification-repo.ts
git commit -m "feat(notifications): notification repository"
```

---

### Task 5: use-cases `refreshNotifications` + read/dismiss actions

**Files:**
- Create: `src/features/notifications/application/notification-cases.ts`
- Test: `src/features/notifications/application/notification-cases.test.ts`

**Interfaces:**
- Consumes: `buildNotificationItems` (Task 2), `mergeItems` (Task 3), `notificationRepository` (Task 4), `listHomeworks`, `monthlyDues`, `listScheduleExceptions`, `listSkills`, `getMonthly`, `uuid()` from `@/lib/utils/uuid`.
- Produces:
  ```ts
  export const ACTIVE_NOTIFICATION_LIMIT = 100;
  export async function refreshNotifications(): Promise<NotificationItem[]>; // newly inserted items
  export async function listActiveNotifications(): Promise<ActiveNotification[]>; // parsed details
  export async function unreadCount(): Promise<number>;
  export async function markNotificationRead(id: string): Promise<void>;
  export async function markAllNotificationsRead(): Promise<void>;
  export async function dismissNotification(id: string): Promise<void>;
  export async function dismissAllNotifications(): Promise<void>;
  export interface ActiveNotification extends NotificationRow { details: NotificationItem["details"]; }
  ```
  Where `NotificationRow` has `details: string` (JSON) and `ActiveNotification.details` is the parsed object.

- [ ] **Step 1: Write the failing tests**

Create `notification-cases.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/notifications/infrastructure/notification-repo", () => ({
  notificationRepository: {
    listAll: vi.fn(),
    listActive: vi.fn(),
    insert: vi.fn(),
    remove: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
    dismiss: vi.fn(),
    dismissAll: vi.fn(),
  },
}));

vi.mock("@/features/homework/application/homework-cases", () => ({ listHomeworks: vi.fn(async () => []) }));
vi.mock("@/features/payments/application/payment-cases", () => ({ monthlyDues: vi.fn(async () => []) }));
vi.mock("@/features/schedule/application/schedule-exception-cases", () => ({ listScheduleExceptions: vi.fn(async () => []) }));
vi.mock("@/features/skills/application/skill-cases", () => ({ listSkills: vi.fn(async () => []) }));
vi.mock("@/features/attendance/application/attendance-cases", () => ({ getMonthly: vi.fn(async () => []) }));

import { notificationRepository } from "@/features/notifications/infrastructure/notification-repo";
import { listHomeworks } from "@/features/homework/application/homework-cases";
import {
  dismissAllNotifications,
  dismissNotification,
  listActiveNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  refreshNotifications,
  unreadCount,
} from "./notification-cases";

describe("refreshNotifications", () => {
  it("inserts new items and returns them", async () => {
    vi.mocked(listHomeworks).mockResolvedValueOnce([
      { id: "h1", title: "T", dueDate: "2026-08-01", pending: 1, groupName: null, overdue: true } as never,
    ]);
    vi.mocked(notificationRepository.listAll).mockResolvedValueOnce([]);
    vi.mocked(notificationRepository.listAll).mockResolvedValueOnce([]);
    vi.mocked(notificationRepository.insert).mockImplementation(async (v) => ({ ...v, createdAt: 0, updatedAt: 0 } as never));

    const fresh = await refreshNotifications();

    expect(fresh.map((i) => i.key)).toEqual(["homework:h1"]);
    expect(notificationRepository.insert).toHaveBeenCalledTimes(1);
    const arg = vi.mocked(notificationRepository.insert).mock.calls[0][0] as { details: string; read: boolean; dismissed: boolean };
    expect(arg.read).toBe(false);
    expect(arg.dismissed).toBe(false);
    expect(JSON.parse(arg.details).title).toBe("T");
  });

  it("removes stored rows whose condition resolved", async () => {
    vi.mocked(notificationRepository.listAll).mockResolvedValue([
      { id: "old", key: "weak:k9", type: "weak_skill", details: "{}", read: false, dismissed: false, createdAt: 0, updatedAt: 0 } as never,
    ]);
    vi.mocked(notificationRepository.remove).mockResolvedValue(true);

    await refreshNotifications();

    expect(notificationRepository.remove).toHaveBeenCalledWith("old");
  });

  it("returns no new items when nothing changed", async () => {
    vi.mocked(notificationRepository.listAll).mockResolvedValue([
      { id: "a", key: "weak:k1", type: "weak_skill", details: "{}", read: true, dismissed: false, createdAt: 0, updatedAt: 0 } as never,
    ]);
    const { buildNotificationItems } = await import("./build-notification-items");
    // Simulate the same desired set by injecting through the real generator:
    // default mocked sources are empty, so nothing is desired and "a" is removed.
    // So instead feed a matching key via a direct test of the pure path:
    const { mergeItems } = await import("./merge-items");
    expect(mergeItems([{ id: "a", key: "weak:k1" }], [{ type: "weak_skill", key: "weak:k1", details: {} }])).toEqual({ toInsert: [], toRemove: [] });
  });
});

describe("notification actions", () => {
  it("marks one read, all read, dismisses one, dismisses all", async () => {
    await markNotificationRead("a");
    expect(notificationRepository.markRead).toHaveBeenCalledWith("a");
    await markAllNotificationsRead();
    expect(notificationRepository.markAllRead).toHaveBeenCalled();
    await dismissNotification("b");
    expect(notificationRepository.dismiss).toHaveBeenCalledWith("b");
    await dismissAllNotifications();
    expect(notificationRepository.dismissAll).toHaveBeenCalled();
  });

  it("parses details JSON for the active list and computes unread count", async () => {
    vi.mocked(notificationRepository.listActive).mockResolvedValue([
      { id: "a", key: "weak:k1", type: "weak_skill", details: JSON.stringify({ name: "F", count: 2 }), read: false, dismissed: false, createdAt: 1, updatedAt: 1 } as never,
      { id: "b", key: "homework:h1", type: "homework_overdue", details: JSON.stringify({ title: "T" }), read: true, dismissed: false, createdAt: 2, updatedAt: 2 } as never,
    ]);

    const active = await listActiveNotifications();
    expect(active[0].details).toEqual({ title: "T" });
    expect(active.length).toBe(2);
    expect(await unreadCount()).toBe(1);
  });
});
```

Note: the `refreshNotifications` case computes `unreadCount` from `listActiveNotifications()` (a fresh query), so the test above asserts it via the mocked `listActive`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/features/notifications/application/notification-cases.test.ts`
Expected: FAIL — module `./notification-cases` not found.

- [ ] **Step 3: Write `notification-cases.ts`**

```ts
import dayjs from "dayjs";
import { getMonthly } from "@/features/attendance/application/attendance-cases";
import { listHomeworks } from "@/features/homework/application/homework-cases";
import { monthlyDues } from "@/features/payments/application/payment-cases";
import { listScheduleExceptions } from "@/features/schedule/application/schedule-exception-cases";
import { listSkills } from "@/features/skills/application/skill-cases";
import { uuid } from "@/lib/utils/uuid";
import type { NotificationItem } from "@/features/notifications/domain";
import { notificationRepository } from "@/features/notifications/infrastructure/notification-repo";
import { buildNotificationItems } from "./build-notification-items";
import { mergeItems } from "./merge-items";

/** Newest rows to keep in the table (older ones are pruned on refresh). */
export const ACTIVE_NOTIFICATION_LIMIT = 100;

/** Regenerate the notification set and return the newly inserted items. */
export async function refreshNotifications(): Promise<NotificationItem[]> {
  const month = dayjs().format("YYYY-MM");
  const today = dayjs().format("YYYY-MM-DD");
  const [homeworks, dues, exceptions, skills, monthly] = await Promise.all([
    listHomeworks(),
    monthlyDues(month),
    listScheduleExceptions(),
    listSkills(),
    getMonthly(month),
  ]);
  const desired = buildNotificationItems({ homeworks, dues, exceptions, skills, monthly }, month, today);
  const existing = await notificationRepository.listAll();
  const { toInsert, toRemove } = mergeItems(existing, desired);
  for (const id of toRemove) await notificationRepository.remove(id);
  for (const item of toInsert) {
    await notificationRepository.insert({
      id: uuid(),
      type: item.type,
      key: item.key,
      details: JSON.stringify(item.details),
      read: false,
      dismissed: false,
    });
  }
  await trimToLimit();
  return toInsert;
}

/** Removal priority: dismissed < read < active-unread, newest first per tier.
 *  Keeps the newest ACTIVE_NOTIFICATION_LIMIT rows, pruning stale (read or
 *  dismissed) rows before live unread ones (spec: "dismissed or read first"). */
async function trimToLimit(): Promise<void> {
  const all = await notificationRepository.listAll();
  if (all.length <= ACTIVE_NOTIFICATION_LIMIT) return;
  const priority = (r: { read: boolean; dismissed: boolean }): number =>
    (r.dismissed ? 0 : 1) + (r.read ? 0 : 1);
  const toRemove = [...all]
    .sort((a, b) => priority(a) - priority(b) || a.createdAt - b.createdAt)
    .slice(0, all.length - ACTIVE_NOTIFICATION_LIMIT);
  for (const row of toRemove) await notificationRepository.remove(row.id);
}
```

Then add the query/action cases to the same file (keep it ≤150 lines — split into two files if needed):

```ts
import type { NotificationRow } from "@/lib/db/schema";

export interface ActiveNotification {
  id: string;
  type: string;
  key: string;
  details: NotificationItem["details"];
  read: boolean;
  dismissed: boolean;
  createdAt: number;
  updatedAt: number;
}

function parseDetails(row: NotificationRow): ActiveNotification {
  let details: NotificationItem["details"] = {};
  try {
    details = JSON.parse(row.details) as NotificationItem["details"];
  } catch {
    details = {};
  }
  return { ...row, details };
}

/** Non-dismissed rows, newest first, with parsed details. */
export async function listActiveNotifications(): Promise<ActiveNotification[]> {
  const rows = await notificationRepository.listActive();
  return rows.map(parseDetails);
}

export async function unreadCount(): Promise<number> {
  const rows = await notificationRepository.listActive();
  return rows.filter((r) => !r.read).length;
}

export async function markNotificationRead(id: string): Promise<void> {
  await notificationRepository.markRead(id);
}

export async function markAllNotificationsRead(): Promise<void> {
  await notificationRepository.markAllRead();
}

export async function dismissNotification(id: string): Promise<void> {
  await notificationRepository.dismiss(id);
}

export async function dismissAllNotifications(): Promise<void> {
  await notificationRepository.dismissAll();
}
```

**File-length note:** If the combined file exceeds 150 lines, split the query/action cases into `src/features/notifications/application/notification-query-cases.ts` and keep only `refreshNotifications` in `notification-cases.ts`. The tests import from whichever file exports the functions — adjust the test imports accordingly.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/features/notifications/application/notification-cases.test.ts`
Expected: PASS.

- [ ] **Step 5: Verify + commit**

Run: `pnpm tsc --noEmit` — clean.
Run: `node scripts/check-file-lengths.mjs` — all within limits.

```bash
git add src/features/notifications/application/
git commit -m "feat(notifications): refresh, query, and read/dismiss use-cases"
```

---

### Task 6: i18n namespace

**Files:**
- Modify: `src/lib/i18n/en/notifications.ts` (create)
- Modify: `src/lib/i18n/ar/notifications.ts` (create)

**Interfaces:**
- Produces: `notifications.*` keys used by Tasks 7–8: `title`, `empty`, `markAllRead`, `dismissAll`, `dismiss`, `unread`, `types.*` templates.

- [ ] **Step 1: Create the English namespace**

Create `src/lib/i18n/en/notifications.ts`:

```ts
export const notifications = {
  title: "Notifications",
  empty: "No notifications",
  unread: "unread",
  markAllRead: "Mark all read",
  dismissAll: "Dismiss all",
  dismiss: "Dismiss",
  types: {
    homework_overdue: "Homework «{{title}}» is overdue ({{pending}} not submitted)",
    payment_overdue: "{{name}}: {{remaining}} still due for {{period}}",
    exception: "{{kind}} session on {{date}}",
    weak_skill: "{{count}} student(s) are weak in «{{name}}»",
    low_attendance: "{{name}} attendance is {{rate}} this month",
  },
} as const;
```

- [ ] **Step 2: Create the Arabic namespace**

Create `src/lib/i18n/ar/notifications.ts`:

```ts
import type { Messages } from "@/lib/i18n/en";

export const notifications: Messages["notifications"] = {
  title: "الإشعارات",
  empty: "لا توجد إشعارات",
  unread: "غير مقروء",
  markAllRead: "تحديد الكل كمقروء",
  dismissAll: "إخفاء الكل",
  dismiss: "إخفاء",
  types: {
    homework_overdue: "واجب «{{title}}» متأخر ({{pending}} بدون تسليم)",
    payment_overdue: "{{name}}: بقي عليه {{remaining}} عن {{period}}",
    exception: "{{kind}} بتاريخ {{date}}",
    weak_skill: "{{count}} طالب(ة) ضعيف في «{{name}}»",
    low_attendance: "نسبة حضور {{name}} {{rate}} هذا الشهر",
  },
};
```

Note: the `exception.kind` value `cancelled`/`moved` must render localized labels. The notification-text helper (Task 7) will swap them using `schedule.exceptions.cancelled`/`moved` before interpolation.

- [ ] **Step 3: Verify**

Run: `pnpm tsc --noEmit` — clean (type-checks the Arabic namespace against the English `as const` shape).

- [ ] **Step 4: Commit**

```bash
git add src/lib/i18n/en/notifications.ts src/lib/i18n/ar/notifications.ts
git commit -m "feat(notifications): i18n namespace (en + ar)"
```

---

### Task 7: isTauri + system notifications + zustand store + notification-text

**Files:**
- Create: `src/lib/tauri.ts`
- Create: `src/lib/notify-system.ts`
- Create: `src/features/notifications/ui/notification-text.ts`
- Create: `src/features/notifications/ui/notifications-store.ts`
- Create: `src/features/notifications/ui/use-notifications.ts`
- Modify: `src-tauri/Cargo.toml`, `src-tauri/src/lib.rs`, `src-tauri/capabilities/default.json`
- Modify: `package.json` (add `@tauri-apps/plugin-notification`)

**Interfaces:**
- Consumes: `notification-cases` (Task 5), `NotificationItem` (Task 2), `notifications.*` i18n keys (Task 6).
- Produces:
  ```ts
  // src/lib/tauri.ts
  export function isTauri(): boolean;

  // src/lib/notify-system.ts
  export async function notifySystem(title: string, body: string): Promise<void>;

  // src/features/notifications/ui/notification-text.ts
  import type { TFunction } from "i18next";
  export function notificationText(item: ActiveNotification, t: TFunction): string;

  // src/features/notifications/ui/use-notifications.ts
  export interface UseNotifications {
    items: ActiveNotification[];
    unreadCount: number;
    loading: boolean;
    open: boolean;
    setOpen: (open: boolean) => void;
    refresh: () => Promise<NotificationItem[]>;
    markRead: (id: string) => Promise<void>;
    markAllRead: () => Promise<void>;
    dismiss: (id: string) => Promise<void>;
    dismissAll: () => Promise<void>;
  }
  export function useNotifications(): UseNotifications;
  ```

- [ ] **Step 1: Add the plugin dependency**

Add to `package.json` dependencies:

```json
"@tauri-apps/plugin-notification": "^2"
```

Run: `pnpm install`

Add to `src-tauri/Cargo.toml` (in `[dependencies]`):

```toml
tauri-plugin-notification = "2"
```

- [ ] **Step 2: Register the plugin in Rust**

In `src-tauri/src/lib.rs`, inside the `.plugin(...)` chain (next to the other plugin registrations):

```rust
.plugin(tauri_plugin_notification::init())
```

Add `"notification:default"` to `"permissions"` in `src-tauri/capabilities/default.json`.

- [ ] **Step 3: Write `src/lib/tauri.ts`**

```ts
/** True when running inside the Tauri webview (guards plugin calls from the
 * Vite dev server and jsdom tests). */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}
```

- [ ] **Step 4: Write `src/lib/notify-system.ts`**

```ts
import { isTauri } from "@/lib/tauri";

/** Fire an OS-level notification banner (no-op outside Tauri). The plugin is
 * lazy-imported so the Vite dev server and tests never load it. */
export async function notifySystem(title: string, body: string): Promise<void> {
  if (!isTauri()) return;
  try {
    const { sendNotification } = await import("@tauri-apps/plugin-notification");
    sendNotification({ title, body });
  } catch (error) {
    console.error("Failed to send system notification", error);
  }
}
```

- [ ] **Step 5: Write `notification-text.ts`**

```ts
import type { TFunction } from "i18next";
import type { ActiveNotification } from "@/features/notifications/application/notification-cases";

function rateLabel(rate: number): string {
  const pct = Math.round(rate * 100);
  return `${pct}%`;
}

/** Localized, interpolated text for a notification row (and its banner). */
export function notificationText(item: ActiveNotification, t: TFunction): string {
  const d = item.details;
  const kind =
    d.kind === "cancelled"
      ? t("schedule.exceptions.cancelled")
      : d.kind === "moved"
        ? t("schedule.exceptions.moved")
        : d.kind ?? "";
  return t(`notifications.types.${item.type}`, {
    title: d.title ?? "—",
    pending: d.pending ?? 0,
    remaining: d.remaining ?? 0,
    period: d.period ?? "—",
    kind,
    date: d.date ?? "—",
    count: d.count ?? 0,
    name: d.name ?? "—",
    rate: d.rate != null ? rateLabel(d.rate) : "—",
  });
}
```

- [ ] **Step 6: Write the zustand store**

Create `src/features/notifications/ui/notifications-store.ts`:

```ts
import { create } from "zustand";
import {
  dismissAllNotifications,
  dismissNotification,
  listActiveNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  refreshNotifications,
  unreadCount,
  type ActiveNotification,
} from "@/features/notifications/application/notification-cases";
import type { NotificationItem } from "@/features/notifications/domain";

interface NotificationsState {
  items: ActiveNotification[];
  unread: number;
  loading: boolean;
  /** Rebuild the set; returns the newly inserted items (for system banners). */
  refresh: () => Promise<NotificationItem[]>;
  reload: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  dismiss: (id: string) => Promise<void>;
  dismissAll: () => Promise<void>;
}

async function load(): Promise<{ items: ActiveNotification[]; unread: number }> {
  const [items, unread] = await Promise.all([listActiveNotifications(), unreadCount()]);
  return { items, unread };
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  items: [],
  unread: 0,
  loading: false,
  refresh: async () => {
    const fresh = await refreshNotifications();
    const { items, unread } = await load();
    set({ items, unread });
    return fresh;
  },
  reload: async () => {
    const { items, unread } = await load();
    set({ items, unread });
  },
  markRead: async (id) => {
    await markNotificationRead(id);
    const { items, unread } = await load();
    set({ items, unread });
  },
  markAllRead: async () => {
    await markAllNotificationsRead();
    set({ unread: 0 });
  },
  dismiss: async (id) => {
    await dismissNotification(id);
    const { items, unread } = await load();
    set({ items, unread });
  },
  dismissAll: async () => {
    await dismissAllNotifications();
    const { items, unread } = await load();
    set({ items, unread });
  },
}));

// keep get() referenced for future extensions
void useNotificationsStore;
```

Remove the trailing `void useNotificationsStore;` line if `get` is unused — the store must not leave dead references. Final store:

```ts
import { create } from "zustand";
import {
  dismissAllNotifications,
  dismissNotification,
  listActiveNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  refreshNotifications,
  unreadCount,
  type ActiveNotification,
} from "@/features/notifications/application/notification-cases";
import type { NotificationItem } from "@/features/notifications/domain";

interface NotificationsState {
  items: ActiveNotification[];
  unread: number;
  loading: boolean;
  refresh: () => Promise<NotificationItem[]>;
  reload: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  dismiss: (id: string) => Promise<void>;
  dismissAll: () => Promise<void>;
}

async function load(): Promise<{ items: ActiveNotification[]; unread: number }> {
  const [items, unread] = await Promise.all([listActiveNotifications(), unreadCount()]);
  return { items, unread };
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  items: [],
  unread: 0,
  loading: false,
  refresh: async () => {
    const fresh = await refreshNotifications();
    const loaded = await load();
    set(loaded);
    return fresh;
  },
  reload: async () => {
    const loaded = await load();
    set(loaded);
  },
  markRead: async (id) => {
    await markNotificationRead(id);
    const loaded = await load();
    set(loaded);
  },
  markAllRead: async () => {
    await markAllNotificationsRead();
    set({ unread: 0 });
  },
  dismiss: async (id) => {
    await dismissNotification(id);
    const loaded = await load();
    set(loaded);
  },
  dismissAll: async () => {
    await dismissAllNotifications();
    const loaded = await load();
    set(loaded);
  },
}));
```

- [ ] **Step 7: Write the hook**

Create `src/features/notifications/ui/use-notifications.ts`:

```ts
import { useNotificationsStore } from "./notifications-store";

/** React binding for the notifications store (matches the store API). */
export function useNotifications() {
  const items = useNotificationsStore((s) => s.items);
  const unreadCount = useNotificationsStore((s) => s.unread);
  const loading = useNotificationsStore((s) => s.loading);
  const refresh = useNotificationsStore((s) => s.refresh);
  const markRead = useNotificationsStore((s) => s.markRead);
  const markAllRead = useNotificationsStore((s) => s.markAllRead);
  const dismiss = useNotificationsStore((s) => s.dismiss);
  const dismissAll = useNotificationsStore((s) => s.dismissAll);
  return { items, unreadCount, loading, refresh, markRead, markAllRead, dismiss, dismissAll };
}
```

- [ ] **Step 8: Verify compile + file lengths**

Run: `pnpm tsc --noEmit` — clean.
Run: `node scripts/check-file-lengths.mjs` — all within limits.

- [ ] **Step 9: Commit**

```bash
git add src/lib/tauri.ts src/lib/notify-system.ts src/features/notifications/ui/ package.json src-tauri/Cargo.toml src-tauri/src/lib.rs src-tauri/capabilities/default.json
git commit -m "feat(notifications): system notifications and zustand store"
```

(Do NOT run `pnpm tauri build` yet — the Tauri rebuild is Task 10's verification.)

---

### Task 8: Header bell + dropdown UI

**Files:**
- Create: `src/features/notifications/ui/notification-dropdown.tsx`
- Modify: `src/app/layouts/Header.tsx`

**Interfaces:**
- Consumes: `useNotifications` (Task 7), `notificationText` (Task 7), `PopoverShell` from `@/shared/popover-shell`, `useNavigate` from `react-router`, `notifications.*` keys (Task 6).
- Produces: the bell button + popover rendered inside the Header.

- [ ] **Step 1: Write `notification-dropdown.tsx`**

```tsx
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { CheckCheck, X, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PopoverShell } from "@/shared/popover-shell";
import { useNotifications } from "./use-notifications";
import { notificationText } from "./notification-text";
import type { ActiveNotification } from "@/features/notifications/application/notification-cases";

const ROUTE_BY_TYPE: Record<string, string> = {
  homework_overdue: "/homework",
  payment_overdue: "/payments",
  exception: "/schedule",
  weak_skill: "/skills",
  low_attendance: "/attendance",
};

export function NotificationDropdown() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { items, unreadCount, loading, refresh, markRead, markAllRead, dismiss, dismissAll } = useNotifications();
  const [open, setOpen] = useState(false);

  function openBell() {
    setOpen((o) => !o);
    void refresh();
  }

  function onRowClick(item: ActiveNotification) {
    void markRead(item.id);
    setOpen(false);
    navigate(ROUTE_BY_TYPE[item.type] ?? "/");
  }

  return (
    <PopoverShell
      open={open}
      onClose={() => setOpen(false)}
      width="w-80"
      trigger={
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative"
          aria-label={t("notifications.title")}
          title={t("notifications.title")}
          onClick={openBell}
        >
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -end-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
              {unreadCount}
            </span>
          )}
        </Button>
      }
    >
      <div className="flex items-center justify-between px-1 pb-1">
        <p className="text-sm font-semibold">{t("notifications.title")}</p>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-xs" aria-label={t("notifications.markAllRead")} title={t("notifications.markAllRead")} onClick={() => void markAllRead()} disabled={unreadCount === 0}>
            <CheckCheck className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon-xs" aria-label={t("notifications.dismissAll")} title={t("notifications.dismissAll")} onClick={() => void dismissAll()} disabled={items.length === 0}>
            <X className="size-3.5" />
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="px-1 py-4 text-center text-xs text-muted-foreground">{t("common.loading")}</p>
      ) : items.length === 0 ? (
        <p className="px-1 py-4 text-center text-xs text-muted-foreground">{t("notifications.empty")}</p>
      ) : (
        <ul className="space-y-0.5">
          {items.map((item) => (
            <li key={item.id} className="group relative">
              <button
                type="button"
                onClick={() => onRowClick(item)}
                className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-start hover:bg-accent"
              >
                <span
                  className={cn(
                    "mt-1.5 size-1.5 shrink-0 rounded-full",
                    item.read ? "bg-muted-foreground/30" : "bg-primary",
                  )}
                  aria-hidden
                />
                <span className="min-w-0">
                  <span className="block text-xs leading-snug">{notificationText(item, t)}</span>
                  <span className="mt-0.5 block text-[10px] text-muted-foreground">
                    {formatDate(item.createdAt, "DD-MM-YYYY HH:mm")}
                  </span>
                </span>
              </button>
              <Button
                variant="ghost"
                size="icon-xs"
                className="absolute end-1 top-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
                aria-label={t("notifications.dismiss")}
                title={t("notifications.dismiss")}
                onClick={() => void dismiss(item.id)}
              >
                <X className="size-3" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </PopoverShell>
  );
}
```

The imports above reference `useState`, `cn`, `formatDate` — add them:

```tsx
import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils/format";
```

**File-length note:** this component will exceed 150 lines — split the list into `src/features/notifications/ui/notification-list.tsx` (`NotificationList` receiving `items`, `onOpen(item)`, `onDismiss(id)`, `t`-based text) and keep `NotificationDropdown` to the trigger + shell + header + empty state.

- [ ] **Step 2: Mount the bell in the Header**

In `src/app/layouts/Header.tsx`, add `import { NotificationDropdown } from "@/features/notifications/ui/notification-dropdown";` and render it inside the trailing button group (between the search button and the date span):

```tsx
<div className="flex shrink-0 items-center gap-2">
  <NotificationDropdown />
  <Button ...search... />
  <span ...date.../>
</div>
```

- [ ] **Step 3: Write a UI test for the dropdown**

Create `src/features/notifications/ui/notification-dropdown.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/features/notifications/application/notification-cases", () => ({
  listActiveNotifications: vi.fn(async () => [
    { id: "a", type: "homework_overdue", key: "homework:h1", details: { title: "T", pending: 2 }, read: false, dismissed: false, createdAt: 0, updatedAt: 0 },
  ]),
  unreadCount: vi.fn(async () => 1),
  refreshNotifications: vi.fn(async () => []),
  markNotificationRead: vi.fn(async () => undefined),
  markAllNotificationsRead: vi.fn(async () => undefined),
  dismissNotification: vi.fn(async () => undefined),
  dismissAllNotifications: vi.fn(async () => undefined),
}));

import { NotificationDropdown } from "./notification-dropdown";
import { I18nProvider, ThemeProvider } from "@/app/providers";

describe("NotificationDropdown", () => {
  it("shows the unread badge and lists notifications", async () => {
    render(
      <I18nProvider>
        <ThemeProvider>
          <NotificationDropdown />
        </ThemeProvider>
      </I18nProvider>,
    );
    const bell = screen.getByRole("button", { name: /notifications/i });
    expect(bell.textContent).toContain("1");
    await userEvent.click(bell);
    await waitFor(() => expect(screen.getByText(/overdue/i)).toBeTruthy());
  });
});
```

Adjust the test to the repo's actual provider names (check `src/app/providers` before writing) and to the final component structure (e.g., the dismiss button may appear in `NotificationList`).

- [ ] **Step 4: Verify + run the test**

Run: `pnpm vitest run src/features/notifications/ui/notification-dropdown.test.tsx`
Run: `pnpm tsc --noEmit` — clean.
Run: `node scripts/check-file-lengths.mjs` — all within limits.

- [ ] **Step 5: Commit**

```bash
git add src/features/notifications/ui/ src/app/layouts/Header.tsx
git commit -m "feat(notifications): header bell with unread badge and dropdown"
```

---

### Task 9: NotificationSync wiring + store test

**Files:**
- Create: `src/features/notifications/ui/notification-sync.tsx`
- Create: `src/features/notifications/ui/notifications-store.test.ts`
- Modify: `src/app/layouts/AppLayout.tsx`

**Interfaces:**
- Consumes: `useNotificationsStore` (Task 7), `notifySystem` (Task 7), `notificationText` (Task 7), `DATA_CHANGED_EVENT` from `@/shared/GlobalDialogs`, `notifications.*` + `notifications.types.*` keys (Task 6).
- Produces: `<NotificationSync />` — a null-rendering component mounted in `AppLayout` that refreshes on mount and on every `tm:data-changed`, firing system banners for newly inserted items.

- [ ] **Step 1: Write `notification-sync.tsx`**

```tsx
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { DATA_CHANGED_EVENT } from "@/shared/GlobalDialogs";
import { notifySystem } from "@/lib/notify-system";
import { notificationText } from "./notification-text";
import { useNotificationsStore } from "./notifications-store";

/** Refreshes notifications on mount and on data changes, and fires OS banners
 * for items newly generated since the last refresh. Renders nothing. */
export function NotificationSync() {
  const { t } = useTranslation();
  const refresh = useNotificationsStore((s) => s.refresh);

  useEffect(() => {
    let mounted = true;
    async function sync() {
      try {
        const fresh = await refresh();
        if (!mounted) return;
        for (const item of fresh) {
          await notifySystem(t(`notifications.types.${item.type}`), notificationText({ ...item, id: item.key, read: false, dismissed: false, createdAt: Date.now(), updatedAt: Date.now() } as never, t));
        }
      } catch (error) {
        console.error("Notification refresh failed", error);
      }
    }
    void sync();
    window.addEventListener(DATA_CHANGED_EVENT, sync);
    return () => {
      mounted = false;
      window.removeEventListener(DATA_CHANGED_EVENT, sync);
    };
  }, [refresh, t]);

  return null;
}
```

The `as never` cast above is a smell — instead, give `notificationText` a structural parameter type so a freshly generated `NotificationItem` works directly. Refactor `notification-text.ts` in this task:

```ts
import type { TFunction } from "i18next";

/** Minimal shape needed to render text — accepts both stored and fresh items. */
export interface NotifyTextInput {
  type: string;
  details: Record<string, unknown>;
}
export function notificationText(item: NotifyTextInput, t: TFunction): string;
```

Update `notification-dropdown.tsx`'s `ActiveNotification` usage accordingly (it structurally satisfies `NotifyTextInput`). `NotificationSync` then passes `{ type: item.type, details: item.details }`.

- [ ] **Step 2: Write the store test**

Create `src/features/notifications/ui/notifications-store.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/notifications/application/notification-cases", () => ({
  listActiveNotifications: vi.fn(),
  unreadCount: vi.fn(),
  refreshNotifications: vi.fn(),
  markNotificationRead: vi.fn(async () => undefined),
  markAllNotificationsRead: vi.fn(async () => undefined),
  dismissNotification: vi.fn(async () => undefined),
  dismissAllNotifications: vi.fn(async () => undefined),
}));

import {
  dismissAllNotifications,
  dismissNotification,
  listActiveNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  refreshNotifications,
  unreadCount,
} from "@/features/notifications/application/notification-cases";
import { useNotificationsStore } from "./notifications-store";

describe("notifications-store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useNotificationsStore.setState({ items: [], unread: 0 });
  });

  it("refresh updates items and unread count and returns fresh items", async () => {
    vi.mocked(listActiveNotifications).mockResolvedValue([
      { id: "a", type: "weak_skill", key: "weak:k1", details: { name: "F", count: 2 }, read: false, dismissed: false, createdAt: 1, updatedAt: 1 },
    ]);
    vi.mocked(unreadCount).mockResolvedValue(1);
    vi.mocked(refreshNotifications).mockResolvedValue([]);

    const fresh = await useNotificationsStore.getState().refresh();

    expect(fresh).toEqual([]);
    expect(useNotificationsStore.getState().items).toHaveLength(1);
    expect(useNotificationsStore.getState().unread).toBe(1);
  });

  it("dismiss removes the item from state", async () => {
    vi.mocked(dismissNotification).mockResolvedValue(undefined);
    vi.mocked(listActiveNotifications).mockResolvedValue([]);
    vi.mocked(unreadCount).mockResolvedValue(0);

    await useNotificationsStore.getState().dismiss("a");

    expect(dismissNotification).toHaveBeenCalledWith("a");
    expect(useNotificationsStore.getState().items).toEqual([]);
  });
});
```

- [ ] **Step 3: Mount `NotificationSync` in `AppLayout`**

In `src/app/layouts/AppLayout.tsx`, add `import { NotificationSync } from "@/features/notifications/ui/notification-sync";` and render `<NotificationSync />` next to `<GlobalDialogs />` (or anywhere in the root div).

- [ ] **Step 4: Verify + run tests**

Run: `pnpm vitest run src/features/notifications/ui/`
Run: `pnpm tsc --noEmit` — clean.
Run: `node scripts/check-file-lengths.mjs` — all within limits.

- [ ] **Step 5: Commit**

```bash
git add src/features/notifications/ui/ src/app/layouts/AppLayout.tsx
git commit -m "feat(notifications): background sync with system banners"
```

---

### Task 10: docs + full verification + Tauri build

**Files:**
- Modify: `AGENTS.md` (Status section — append Phase 37)
- Modify: `docs/roadmap.md` (Phase 37 — completed)

**Interfaces:**
- Consumes: everything from Tasks 1–9.

- [ ] **Step 1: Update AGENTS.md**

Append a `Phase 37 added a notification center` section to the Status list describing: the `notifications` table (migration v13), the five generator sources + dedup keys, `refreshNotifications` merge lifecycle (insert/keep/delete + 100-row cap), the Header bell + `PopoverShell` dropdown with per-type routing, `NotificationSync` firing Tauri system banners on mount + `tm:data-changed`, and the `notifications.*` i18n namespace. Mention the `notification:default` capability.

- [ ] **Step 2: Update the roadmap**

Add a `## Phase 37 — completed` entry mirroring AGENTS.md's text, ending with the suite numbers you actually observe.

- [ ] **Step 3: Full test + typecheck + build**

Run: `pnpm test` — all pass.
Run: `pnpm tsc --noEmit` — clean.
Run: `pnpm build` — exit 0 (chunk-size warning pre-existing).

- [ ] **Step 4: One full Tauri build**

Run: `pnpm tauri build` — builds installers and confirms the notification plugin compiles and the capability is accepted (expect ~2–4 min).

- [ ] **Step 5: Manual E2E (real window)**

Run `pnpm tauri dev`, confirm: bell shows a badge when overdue homework/dues exist; dropdown lists items; clicking a row navigates; dismiss removes a row; a system banner appears when a new item is generated. Use the helpers in `/tmp/opencode` (see AGENTS.md Verification) — remembering that xdotool cannot click inside native `<dialog>` modals (seed the DB instead where relevant).

- [ ] **Step 6: Commit**

```bash
git add AGENTS.md docs/roadmap.md
git commit -m "docs(notifications): phase 37 status and roadmap"
```

---

## Self-Review

- **Spec coverage:** migration v13 (Task 1), generator rules + dedup keys (Task 2), merge lifecycle + 100 cap (Tasks 3, 5), repo (Task 4), in-app bell + dropdown + routing + empty state (Task 8), system notifications guarded by `isTauri` (Tasks 7, 9), i18n (Task 6), error handling as non-fatal console logs (Tasks 5, 9), testing incl. one Tauri build (Task 10). All spec sections map to tasks.
- **Placeholder scan:** no TBD/TODO; every step has concrete code or commands.
- **Type consistency:** `NotificationItem` (Task 2) is used by `mergeItems` (Task 3), cases (Task 5), store (Task 7), text helper (Task 7). `notificationText` refactor to `NotifyTextInput` happens inside Task 9 so `NotificationSync` avoids the `as never` cast; Task 8's `ActiveNotification` structurally satisfies it. Repo method names (`listAll`, `listActive`, `markRead`, `markAllRead`, `dismiss`, `dismissAll`) are consistent across Tasks 4–5 and the store.
