# Student Report Card PDF Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-student report card (بطاقة تقرير الطالب) PDF export from the student profile page, reusing the shared pdf-kit and save-file primitives.

**Architecture:** Pure application layer builds `ReportCardData` from the already-loaded `StudentProfileData` (zero new queries) and turns it into a localized `ReportCardPdfData`; an infrastructure exporter renders one A4 page via `pdf-kit`; a UI hook localizes and drives the native save dialog. Mirrors the Phase 34 payment-receipt pattern exactly.

**Tech Stack:** pdf-lib + fontkit (via `src/lib/export/pdf-kit.ts`), `saveFile` (`src/lib/export/save-file.ts`), React hook + react-i18next, vitest (jsdom).

**Spec:** Brainstormed + user-approved design (Phase 35) — sections: attendance summary, homework completion, exam scores, weak skills, notes line; entry button in the profile header.

## Global Constraints

- Every new source file must stay ≤150 lines (repo hard guard is 200; soft target 150). Plan for ~80–120 lines per file.
- All user-facing strings are i18n keys (ar + en) — never hardcode UI text.
- Feature code lives under `src/features/report-card/` with the standard domain/application/infrastructure/ui split.
- No comments unless explaining a non-obvious decision; `ponytail:` prefix for deliberate simplifications.
- Pure layers (data/model builders) get `*.test.ts` files next to them importing `describe/it/expect` from `vitest`.
- Verification before each commit: `pnpm test` (whole suite green), `tsc --noEmit` clean, and `pnpm build` (file-length + tsc + vite) exit 0.
- Latin digits everywhere (per repo convention).
- Reuse existing keys where possible: attendance status labels come from `attendance.statusPresent/statusAbsent/statusLate/statusExcused`; dates format with `formatDateString`.

---

### Task 1: Report-card data aggregation (pure)

**Files:**
- Create: `src/features/report-card/application/report-card-data.ts`
- Test: `src/features/report-card/application/report-card-data.test.ts`

**Interfaces:**
- Consumes: `StudentProfileData` from `@/features/student-profile/application/student-profile-cases` (fields used: `student`, `groups`, `attendanceStats`, `homeworks[]` with `status`, `exams[]` with `score/maxScore/title`, `skills[]` with `weak`).
- Produces: `ReportCardData`, `buildReportCardData(data: StudentProfileData): ReportCardData`, `attendanceRate(s: { present: number; absent: number; late: number; excused: number }): number`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import type { StudentProfileData } from "@/features/student-profile/application/student-profile-cases";
import { attendanceRate, buildReportCardData } from "./report-card-data";

function profile(over: Partial<StudentProfileData>): StudentProfileData {
  const student = {
    id: "s1",
    name: "أحمد",
    enrolledOn: "2026-08-01",
    notes: "متميز",
    status: "active",
    createdAt: 1,
    updatedAt: 1,
  } as unknown as StudentProfileData["student"];
  return {
    student,
    planName: null,
    groups: [{ id: "g1", name: "مجموعة أ" }],
    attendanceStats: { studentId: "s1", present: 8, absent: 2, late: 1, excused: 1 },
    attendanceHistory: [],
    payments: [],
    homeworks: [],
    exams: [],
    sessionAttendance: [],
    skills: [],
    activity: [],
    ...over,
  };
}

describe("buildReportCardData", () => {
  it("copies identity fields and group names", () => {
    const d = buildReportCardData(profile({}));
    expect(d.studentName).toBe("أحمد");
    expect(d.groupNames).toEqual(["مجموعة أ"]);
    expect(d.enrolledOn).toBe("2026-08-01");
    expect(d.notes).toBe("متميز");
  });

  it("counts homework done as submitted or late only", () => {
    const d = buildReportCardData(
      profile({
        homeworks: [
          { status: "submitted" },
          { status: "late" },
          { status: "pending" },
        ] as unknown as StudentProfileData["homeworks"],
      }),
    );
    expect(d.homeworkTotal).toBe(3);
    expect(d.homeworkDone).toBe(2);
  });

  it("keeps only scored exams with title and maxScore", () => {
    const d = buildReportCardData(
      profile({
        exams: [
          { title: "منتصف الفصل", score: 18, maxScore: 20 },
          { title: "غير مصحح", score: null, maxScore: 20 },
        ] as unknown as StudentProfileData["exams"],
      }),
    );
    expect(d.exams).toEqual([{ title: "منتصف الفصل", score: 18, maxScore: 20 }]);
  });

  it("maps weak skills to names", () => {
    const d = buildReportCardData(
      profile({
        skills: [
          { name: "الإملاء", weak: true, skillId: "k1", level: 2, note: null },
          { name: "القراءة", weak: false, skillId: "k2", level: 4, note: null },
        ] as unknown as StudentProfileData["skills"],
      }),
    );
    expect(d.weakSkills).toEqual(["الإملاء"]);
  });

  it("attendanceRate treats present+late+excused as attended", () => {
    expect(attendanceRate({ present: 8, absent: 2, late: 1, excused: 1 })).toBe(83);
    expect(attendanceRate({ present: 0, absent: 0, late: 0, excused: 0 })).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- report-card-data`
Expected: FAIL — `cannot find module './report-card-data'` (file doesn't exist yet).

- [ ] **Step 3: Write the minimal implementation**

```ts
import type { StudentProfileData } from "@/features/student-profile/application/student-profile-cases";
import type { StudentMonthlyStat } from "@/features/attendance/infrastructure/attendance-repo";

export interface ReportCardData {
  studentName: string;
  groupNames: string[];
  enrolledOn: string | null;
  notes: string | null;
  attendance: StudentMonthlyStat;
  homeworkTotal: number;
  homeworkDone: number;
  exams: Array<{ title: string; score: number; maxScore: number }>;
  weakSkills: string[];
}

/** present + late + excused count as attended. */
export function attendanceRate(s: StudentMonthlyStat): number {
  const total = s.present + s.absent + s.late + s.excused;
  return total ? Math.round(((s.present + s.late + s.excused) / total) * 100) : 0;
}

/** Pure aggregation over the already-loaded profile data — no new queries. */
export function buildReportCardData(data: StudentProfileData): ReportCardData {
  const done = data.homeworks.filter((h) => h.status === "submitted" || h.status === "late").length;
  return {
    studentName: data.student.name,
    groupNames: data.groups.map((g) => g.name),
    enrolledOn: data.student.enrolledOn,
    notes: data.student.notes,
    attendance: { ...data.attendanceStats },
    homeworkTotal: data.homeworks.length,
    homeworkDone: done,
    exams: data.exams.flatMap((e) =>
      e.score === null ? [] : [{ title: e.title, score: e.score, maxScore: e.maxScore }],
    ),
    weakSkills: data.skills.filter((s) => s.weak).map((s) => s.name),
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test -- report-card-data`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/report-card/application/report-card-data.ts src/features/report-card/application/report-card-data.test.ts
git commit -m "feat: report card data aggregation (pure)"
```

---

### Task 2: Localized PDF model builder (pure)

**Files:**
- Create: `src/features/report-card/application/report-card-pdf-data.ts`
- Test: `src/features/report-card/application/report-card-pdf-data.test.ts`

**Interfaces:**
- Consumes: `ReportCardData` + `attendanceRate` from Task 1; `formatDateString` from `@/lib/utils/format`.
- Produces: `ReportCardLabels`, `ReportCardExamRow`, `ReportCardPdfData`, `buildReportCardPdfData(data: ReportCardData, labels: ReportCardLabels, rtl: boolean): ReportCardPdfData`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { buildReportCardPdfData, type ReportCardLabels } from "./report-card-pdf-data";
import type { ReportCardData } from "./report-card-data";

const labels: ReportCardLabels = {
  title: "بطاقة تقرير الطالب",
  footer: "أُعدت بواسطة إدارة الدروس",
  group: "المجموعة",
  enrolled: "تاريخ التسجيل",
  attendance: "الحضور",
  homework: "الواجبات",
  exams: "الامتحانات",
  weakSkills: "المهارات الضعيفة",
  notes: "ملاحظات",
  none: "لا يوجد",
  present: "حاضر",
  absent: "غائب",
  late: "متأخر",
  excused: "معذور",
  rate: "النسبة",
};

function data(over: Partial<ReportCardData>): ReportCardData {
  return {
    studentName: "أحمد",
    groupNames: ["مجموعة أ"],
    enrolledOn: "2026-08-01",
    notes: "متميز",
    attendance: { studentId: "s1", present: 8, absent: 2, late: 1, excused: 1 },
    homeworkTotal: 3,
    homeworkDone: 2,
    exams: [{ title: "منتصف الفصل", score: 18, maxScore: 20 }],
    weakSkills: ["الإملاء"],
    ...over,
  };
}

describe("buildReportCardPdfData", () => {
  it("composes attendance and homework summaries", () => {
    const p = buildReportCardPdfData(data({}), labels, true);
    expect(p.attendanceLabel).toBe("الحضور");
    expect(p.attendanceValue).toContain("8 حاضر");
    expect(p.attendanceValue).toContain("2 غائب");
    expect(p.attendanceValue).toContain("83%");
    expect(p.homeworkValue).toBe("2 / 3 (67%)");
  });

  it("joins group names and falls back to none", () => {
    expect(buildReportCardPdfData(data({}), labels, true).groupValue).toBe("مجموعة أ");
    expect(buildReportCardPdfData(data({ groupNames: [] }), labels, true).groupValue).toBe("لا يوجد");
  });

  it("formats enrolled date and falls back to none", () => {
    expect(buildReportCardPdfData(data({}), labels, true).enrolledValue).toBe("01-08-2026");
    expect(buildReportCardPdfData(data({ enrolledOn: null }), labels, true).enrolledValue).toBe("لا يوجد");
  });

  it("maps exam rows and weak-skills list", () => {
    const p = buildReportCardPdfData(data({}), labels, true);
    expect(p.examRows).toEqual([{ name: "منتصف الفصل", value: "18/20" }]);
    expect(p.weakSkillsValue).toBe("الإملاء");
    expect(buildReportCardPdfData(data({ weakSkills: [] }), labels, true).weakSkillsValue).toBe("لا يوجد");
  });

  it("falls back notes to none when empty", () => {
    expect(buildReportCardPdfData(data({ notes: "  " }), labels, true).notesValue).toBe("لا يوجد");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- report-card-pdf-data`
Expected: FAIL — `cannot find module './report-card-pdf-data'`.

- [ ] **Step 3: Write the minimal implementation**

```ts
import { formatDateString } from "@/lib/utils/format";
import { attendanceRate, type ReportCardData } from "./report-card-data";

export interface ReportCardLabels {
  title: string;
  footer: string;
  group: string;
  enrolled: string;
  attendance: string;
  homework: string;
  exams: string;
  weakSkills: string;
  notes: string;
  none: string;
  present: string;
  absent: string;
  late: string;
  excused: string;
  rate: string;
}

export interface ReportCardExamRow {
  name: string;
  value: string;
}

export interface ReportCardPdfData {
  rtl: boolean;
  title: string;
  footer: string;
  studentName: string;
  groupLabel: string;
  groupValue: string;
  enrolledLabel: string;
  enrolledValue: string;
  attendanceLabel: string;
  attendanceValue: string;
  homeworkLabel: string;
  homeworkValue: string;
  examTitle: string;
  examEmpty: string;
  examRows: ReportCardExamRow[];
  weakSkillsLabel: string;
  weakSkillsValue: string;
  notesLabel: string;
  notesValue: string;
}

/** Localize and shape the report-card data for the PDF exporter. */
export function buildReportCardPdfData(
  data: ReportCardData,
  labels: ReportCardLabels,
  rtl: boolean,
): ReportCardPdfData {
  const a = data.attendance;
  const attendanceValue = `${a.present} ${labels.present} · ${a.absent} ${labels.absent} · ${a.late} ${labels.late} · ${a.excused} ${labels.excused} — ${labels.rate} ${attendanceRate(a)}%`;
  const hwRate = data.homeworkTotal
    ? Math.round((data.homeworkDone / data.homeworkTotal) * 100)
    : 0;
  return {
    rtl,
    title: labels.title,
    footer: labels.footer,
    studentName: data.studentName,
    groupLabel: labels.group,
    groupValue: data.groupNames.length ? data.groupNames.join("، ") : labels.none,
    enrolledLabel: labels.enrolled,
    enrolledValue: data.enrolledOn ? formatDateString(data.enrolledOn) : labels.none,
    attendanceLabel: labels.attendance,
    attendanceValue,
    homeworkLabel: labels.homework,
    homeworkValue: `${data.homeworkDone} / ${data.homeworkTotal} (${hwRate}%)`,
    examTitle: labels.exams,
    examEmpty: labels.none,
    examRows: data.exams.map((e) => ({ name: e.title, value: `${e.score}/${e.maxScore}` })),
    weakSkillsLabel: labels.weakSkills,
    weakSkillsValue: data.weakSkills.length ? data.weakSkills.join("، ") : labels.none,
    notesLabel: labels.notes,
    notesValue: data.notes?.trim() || labels.none,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test -- report-card-pdf-data`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/report-card/application/report-card-pdf-data.ts src/features/report-card/application/report-card-pdf-data.test.ts
git commit -m "feat: report card localized PDF model (pure)"
```

---

### Task 3: PDF exporter + export use-case

**Files:**
- Create: `src/features/report-card/infrastructure/report-card-exporter.ts`
- Create: `src/features/report-card/application/report-card-export.ts`

**Interfaces:**
- Consumes: `ReportCardPdfData` from Task 2; `saveFile` from `@/lib/export/save-file`; pdf-kit primitives.
- Produces: `buildReportCardPdf(data: ReportCardPdfData): Promise<Uint8Array>`; `exportReportCardPdf(data: ReportCardPdfData): Promise<void>`.

- [ ] **Step 1: Write the exporter**

```ts
import { PDFDocument } from "pdf-lib";
import {
  PAGE_HEIGHT,
  PAGE_MARGIN,
  PAGE_WIDTH,
  bodyColor,
  drawFittedText,
  gridColor,
  inkColor,
  loadArabicFont,
  mutedColor,
} from "@/lib/export/pdf-kit";
import type { ReportCardPdfData } from "../application/report-card-pdf-data";

const TITLE_SIZE = 20;
const NAME_SIZE = 14;
const LABEL_SIZE = 11;
const VALUE_SIZE = 11;
const FOOTER_SIZE = 10;
const ROW_HEIGHT = 24;
const LABEL_COL = 0.38;
const GAP = 12;

/** Report card PDF — one A4 page: header, meta, summaries, exams, footer. */
export async function buildReportCardPdf(data: ReportCardPdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await loadArabicFont();
  const rtl = data.rtl;
  const tableWidth = PAGE_WIDTH - PAGE_MARGIN * 2;
  const labelW = tableWidth * LABEL_COL;
  const valueW = tableWidth - labelW - GAP;
  const left = rtl ? PAGE_WIDTH - PAGE_MARGIN : PAGE_MARGIN;
  const valueEdge = rtl ? left - labelW - GAP : PAGE_MARGIN + labelW + GAP;

  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - PAGE_MARGIN;

  const rule = () => {
    y -= 8;
    page.drawLine({
      start: { x: PAGE_MARGIN, y },
      end: { x: PAGE_WIDTH - PAGE_MARGIN, y },
      thickness: 0.8,
      color: inkColor,
    });
    y -= 14;
  };

  const row = (
    label: string,
    value: string,
    labelColor: typeof mutedColor,
    valueColor: typeof bodyColor,
  ) => {
    y -= 17;
    drawFittedText(page, font, rtl, label, left, y, LABEL_SIZE, labelColor, labelW);
    drawFittedText(page, font, rtl, value, valueEdge, y, VALUE_SIZE, valueColor, valueW);
    y -= ROW_HEIGHT - 17;
  };

  const sectionTitle = (text: string) => {
    y -= 14;
    drawFittedText(page, font, rtl, text, left, y, LABEL_SIZE, inkColor, tableWidth);
    y -= 10;
  };

  y -= TITLE_SIZE + 8;
  drawFittedText(page, font, rtl, data.title, left, y, TITLE_SIZE, inkColor, tableWidth);
  y -= NAME_SIZE + 10;
  drawFittedText(page, font, rtl, data.studentName, left, y, NAME_SIZE, inkColor, tableWidth);

  rule();
  row(data.groupLabel, data.groupValue, mutedColor, bodyColor);
  row(data.enrolledLabel, data.enrolledValue, mutedColor, bodyColor);
  rule();
  row(data.attendanceLabel, data.attendanceValue, mutedColor, inkColor);
  row(data.homeworkLabel, data.homeworkValue, mutedColor, inkColor);
  rule();
  sectionTitle(data.examTitle);
  if (data.examRows.length === 0) {
    row("", data.examEmpty, mutedColor, mutedColor);
  } else {
    for (const e of data.examRows) row(e.name, e.value, mutedColor, bodyColor);
  }
  rule();
  row(data.weakSkillsLabel, data.weakSkillsValue, mutedColor, bodyColor);
  row(data.notesLabel, data.notesValue, mutedColor, bodyColor);

  rule();
  y -= FOOTER_SIZE + 6;
  drawFittedText(page, font, rtl, data.footer, left, y, FOOTER_SIZE, mutedColor, tableWidth);

  return doc.save();
}
```

Note: `gridColor` is imported but unused in the exporter (the receipt draws row rules with it). Keep the import only if used — remove it from the import list since this layout has no per-row rules.

- [ ] **Step 2: Write the export use-case**

```ts
import { saveFile } from "@/lib/export/save-file";
import { buildReportCardPdf } from "@/features/report-card/infrastructure/report-card-exporter";
import type { ReportCardPdfData } from "./report-card-pdf-data";

/** Export the report card PDF through the native save dialog. */
export async function exportReportCardPdf(data: ReportCardPdfData): Promise<void> {
  const bytes = await buildReportCardPdf(data);
  await saveFile("report-card.pdf", bytes, "PDF", "pdf");
}
```

- [ ] **Step 4: Verify type-check + lengths**

Run: `npx tsc --noEmit`
Expected: clean (catches the placeholder mistake if left in). Then `node scripts/check-file-lengths.mjs` — every file ≤150.

- [ ] **Step 5: Commit**

```bash
git add src/features/report-card/application/report-card-pdf-data.ts src/features/report-card/application/report-card-pdf-data.test.ts src/features/report-card/infrastructure/report-card-exporter.ts src/features/report-card/application/report-card-export.ts
git commit -m "feat: report card PDF exporter + export use-case"
```

---

### Task 4: Report-card export hook

**Files:**
- Create: `src/features/report-card/ui/use-report-card.ts`

**Interfaces:**
- Consumes: `StudentProfileData`; Task 1 `buildReportCardData`; Task 2 `buildReportCardPdfData`; Task 3 `exportReportCardPdf`; `toast` from `@/lib/toast-store`.
- Produces: `useReportCard(data: StudentProfileData): { busy: boolean; run: () => Promise<void> }`.

- [ ] **Step 1: Write the hook**

```ts
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import type { StudentProfileData } from "@/features/student-profile/application/student-profile-cases";
import { buildReportCardData } from "@/features/report-card/application/report-card-data";
import { exportReportCardPdf } from "@/features/report-card/application/report-card-export";
import { buildReportCardPdfData } from "@/features/report-card/application/report-card-pdf-data";
import { toast } from "@/lib/toast-store";

/** Drives the report-card export from the profile header; toasts success/error. */
export function useReportCard(data: StudentProfileData) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  const run = useCallback(async () => {
    setBusy(true);
    try {
      const pdf = buildReportCardPdfData(buildReportCardData(data), {
        title: t("reportCard.title"),
        footer: t("reportCard.footer"),
        group: t("reportCard.group"),
        enrolled: t("reportCard.enrolled"),
        attendance: t("reportCard.attendance"),
        homework: t("reportCard.homework"),
        exams: t("reportCard.exams"),
        weakSkills: t("reportCard.weakSkills"),
        notes: t("reportCard.notes"),
        none: t("reportCard.none"),
        present: t("attendance.statusPresent"),
        absent: t("attendance.statusAbsent"),
        late: t("attendance.statusLate"),
        excused: t("attendance.statusExcused"),
        rate: t("reportCard.rate"),
      }, document.documentElement.dir === "rtl");
      await exportReportCardPdf(pdf);
      toast(t("reportCard.saved"));
    } catch (e) {
      console.error("Failed to export report card", e);
      toast(t("reportCard.error"), "error");
    } finally {
      setBusy(false);
    }
  }, [data, t]);

  return { busy, run };
}
```

- [ ] **Step 2: Verify type-check**

Run: `npx tsc --noEmit`
Expected: clean (fails until Task 5/6 wire the button + keys — acceptable mid-plan; final gate is the full build in Task 6).

---

### Task 5: Profile-header button + page wiring

**Files:**
- Modify: `src/features/student-profile/ui/profile-header.tsx`
- Modify: `src/features/student-profile/ui/StudentProfilePage.tsx`

**Interfaces:**
- Consumes: Task 4 hook; `reportCard.open` i18n key.

- [ ] **Step 1: Extend `ProfileHeader` with the report-card action**

Add props `onReport: () => void` and `reportBusy?: boolean`; import `FileText` from `lucide-react`; render between the edit and statement buttons:

```tsx
<Button size="sm" variant="outline" onClick={onReport} disabled={reportBusy}>
  <FileText className="size-4" />
  {t("reportCard.open")}
</Button>
```

- [ ] **Step 2: Wire the hook in `StudentProfilePage`**

After `useProfileSummary(data)`, add `const { busy: reportBusy, run: runReport } = useReportCard(data);` and pass `onReport={() => void runReport()}` + `reportBusy` to `ProfileHeader`.

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: FAIL only on missing `reportCard` i18n keys (Task 6 fixes) — if it fails on file length, split.

---

### Task 6: i18n keys + registration

**Files:**
- Create: `src/lib/i18n/ar/reportCard.ts`
- Create: `src/lib/i18n/en/reportCard.ts`
- Modify: `src/lib/i18n/ar/index.ts`, `src/lib/i18n/en/index.ts`

- [ ] **Step 1: Write the Arabic namespace**

```ts
export const reportCard = {
  title: "بطاقة تقرير الطالب",
  footer: "أُعدت بواسطة إدارة الدروس",
  group: "المجموعة",
  enrolled: "تاريخ التسجيل",
  attendance: "الحضور",
  homework: "الواجبات",
  exams: "الامتحانات",
  weakSkills: "المهارات الضعيفة",
  notes: "ملاحظات",
  none: "لا يوجد",
  rate: "النسبة",
  open: "تقرير الطالب",
  saved: "تم تصدير التقرير",
  error: "فشل تصدير التقرير",
};
```

- [ ] **Step 2: Write the English namespace**

```ts
export const reportCard = {
  title: "Student Report Card",
  footer: "Generated by Teacher Manager",
  group: "Group",
  enrolled: "Enrolled",
  attendance: "Attendance",
  homework: "Homework",
  exams: "Exams",
  weakSkills: "Weak skills",
  notes: "Notes",
  none: "None",
  rate: "Rate",
  open: "Report Card",
  saved: "Report card exported",
  error: "Failed to export report card",
};
```

- [ ] **Step 3: Register both namespaces**

Add `import { reportCard } from "./reportCard";` to `src/lib/i18n/en/index.ts` and `src/lib/i18n/ar/index.ts`, add `reportCard,` to the merged `en` object and the `ar` object (typed `Messages`, so ar must match en's shape).

- [ ] **Step 4: Full verification**

Run: `pnpm test && pnpm build`
Expected: 94+ tests green (5 new + 5 new = 104), build exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/features/student-profile/ui/profile-header.tsx src/features/student-profile/ui/StudentProfilePage.tsx src/features/report-card/ui/use-report-card.ts src/lib/i18n/ar/reportCard.ts src/lib/i18n/en/reportCard.ts src/lib/i18n/ar/index.ts src/lib/i18n/en/index.ts
git commit -m "feat: report card button on the student profile + i18n"
```

---

### Task 7: Docs

**Files:**
- Modify: `docs/roadmap.md`, `AGENTS.md`

- [ ] **Step 1: Roadmap row + detail**

Add row `| 35 | Student report card PDF (بطاقة تقرير الطالب) from the profile | ✅ Done |` and a detail section describing the data aggregation, pdf-kit reuse, button, and i18n.

- [ ] **Step 2: AGENTS.md status**

Append a `Phase 35` paragraph in the Status section mirroring the style of Phases 33/34.

- [ ] **Step 3: Final commit**

```bash
git add docs/roadmap.md AGENTS.md
git commit -m "docs: phase 35 report card"
```
