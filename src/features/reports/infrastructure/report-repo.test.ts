import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db/client";
import { reportRepository } from "./report-repo";

vi.mock("@/lib/db/client", () => ({ db: { select: vi.fn() } }));

function chainable(rows: unknown[] = [], single?: unknown) {
  const q = {} as Record<string, ReturnType<typeof vi.fn>> & {
    then: (resolve: (rows: unknown[]) => unknown) => Promise<unknown>;
  };
  for (const m of ["from", "where", "orderBy", "groupBy", "innerJoin", "limit", "offset"]) {
    q[m] = vi.fn(() => q);
  }
  q.get = vi.fn(async () => single);
  q.then = (resolve) => Promise.resolve(rows).then(resolve);
  vi.mocked(db.select).mockReturnValue(q as never);
  return q;
}

describe("reportRepository paging", () => {
  beforeEach(() => vi.clearAllMocks());

  it("passes limit/offset on flat lists", async () => {
    const q = chainable([{ id: "s1" }]);
    const rows = await reportRepository.listStudentsOrdered({ limit: 10, offset: 20 });
    expect(rows).toEqual([{ id: "s1" }]);
    expect(q.limit).toHaveBeenCalledWith(10);
    expect(q.offset).toHaveBeenCalledWith(20);
  });

  it("skips limit/offset when no page is given", async () => {
    const q = chainable([]);
    await reportRepository.listExpenses("2026-08");
    expect(q.limit).not.toHaveBeenCalled();
    expect(q.offset).not.toHaveBeenCalled();
  });

  it("pages grouped aggregates after groupBy", async () => {
    const q = chainable([{ studentId: "s1" }]);
    await reportRepository.homeworkAggregates("2026-08", { limit: 5, offset: 10 });
    expect(q.groupBy).toHaveBeenCalledTimes(1);
    expect(q.limit).toHaveBeenCalledWith(5);
    expect(q.offset).toHaveBeenCalledWith(10);
  });

  it("counts ignore paging", async () => {
    chainable([], { n: 42 });
    await expect(reportRepository.countStudents()).resolves.toBe(42);
    chainable([], { n: 7 });
    await expect(reportRepository.countExpenses("2026-08")).resolves.toBe(7);
    chainable([], { n: 3 });
    await expect(reportRepository.countHomeworkGroups("2026-08")).resolves.toBe(3);
    chainable([], { n: 4 });
    await expect(reportRepository.countSessionGroups("2026-08")).resolves.toBe(4);
    chainable([], { n: 2 });
    await expect(reportRepository.countWeakPoints()).resolves.toBe(2);
    chainable([], { n: 9 });
    await expect(reportRepository.countExams("2026-08")).resolves.toBe(9);
  });

  it("counts fall back to zero on empty results", async () => {
    chainable([], undefined);
    await expect(reportRepository.countStudents()).resolves.toBe(0);
  });
});
