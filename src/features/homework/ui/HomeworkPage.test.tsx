import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { listGroups } from "@/features/groups/application/group-cases";
import type { GroupWithCount } from "@/features/groups/infrastructure/group-repo";
import { listHomeworks } from "@/features/homework/application/homework-cases";
import HomeworkPage from "./HomeworkPage";
import i18n from "@/lib/i18n";

vi.mock("@/features/homework/application/homework-cases", () => ({
  listHomeworks: vi.fn(),
  deleteHomework: vi.fn(),
}));

vi.mock("@/features/groups/application/group-cases", () => ({
  listGroups: vi.fn(),
}));

const groups: GroupWithCount[] = [
  { id: "g1", name: "Group A", subject: null, schedule: null, startsOn: null, status: "active", notes: null, createdAt: 1, updatedAt: 1, memberCount: 2 },
  { id: "g2", name: "Group B", subject: null, schedule: null, startsOn: null, status: "active", notes: null, createdAt: 1, updatedAt: 1, memberCount: 1 },
];

const homeworkRows = [
  { id: "h1", groupId: "g1", title: "Worksheet", description: null, dueDate: "2026-08-01", createdAt: 1, updatedAt: 1, groupName: "Group A", submitted: 1, pending: 2, late: 0, completion: 33, overdue: true },
  { id: "h2", groupId: "g2", title: "Revision", description: null, dueDate: "2026-08-03", createdAt: 1, updatedAt: 1, groupName: "Group B", submitted: 0, pending: 3, late: 0, completion: 0, overdue: true },
];

beforeAll(async () => {
  vi.mocked(listGroups).mockResolvedValue(groups);
  vi.mocked(listHomeworks).mockResolvedValue(homeworkRows);
  await i18n.changeLanguage("en");
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("HomeworkPage group filter", () => {
  it("expands the targeted group section and keeps others collapsed", async () => {
    render(
      <MemoryRouter initialEntries={["/homework?group=g1"]}>
        <HomeworkPage />
      </MemoryRouter>,
    );
    expect(await screen.findByRole("button", { name: /Group A/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByRole("button", { name: /Group B/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("starts all sections collapsed without a group param", async () => {
    render(
      <MemoryRouter initialEntries={["/homework"]}>
        <HomeworkPage />
      </MemoryRouter>,
    );
    expect(await screen.findByRole("button", { name: /Group A/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.getByRole("button", { name: /Group B/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });
});
