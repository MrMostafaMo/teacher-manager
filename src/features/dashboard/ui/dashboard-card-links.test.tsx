import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import {
  OverdueHomeworksCard,
  TodaySessionsCard,
  TopDebtorsCard,
  WeakPointsCard,
  WeakSkillsCard,
} from "./DashboardSectionCards";
import i18n from "@/lib/i18n";

beforeAll(async () => {
  await i18n.changeLanguage("en");
});

afterEach(cleanup);

describe("dashboard section cards", () => {
  it.each([
    [<TodaySessionsCard key="sessions" sessions={[]} />, "Today's sessions", "/schedule"],
    [<TopDebtorsCard key="debtors" debtors={[]} />, "Top debtors", "/payments"],
    [<WeakPointsCard key="weak" items={[]} />, "Student weaknesses", "/weak-points"],
    [<WeakSkillsCard key="skills" skills={[]} totalStudents={0} />, "Weakest skills", "/skills"],
  ] as Array<[React.ReactNode, string, string]>)("navigates to %s", (node, label, href) => {
    render(<MemoryRouter>{node}</MemoryRouter>);
    expect(screen.getByRole("link", { name: label })).toHaveAttribute("href", href);
  });
});

describe("OverdueHomeworksCard", () => {
  it("links each row to that group's homework page", () => {
    render(
      <MemoryRouter>
        <OverdueHomeworksCard
          items={[
            {
              id: "h1",
              groupId: "g1",
              title: "Worksheet 4",
              groupName: "Group A",
              dueDate: "2026-08-01",
              pending: 3,
            },
            {
              id: "h2",
              groupId: "g2",
              title: "Revision",
              groupName: "Group B",
              dueDate: "2026-08-03",
              pending: 1,
            },
          ]}
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "Worksheet 4" })).toHaveAttribute(
      "href",
      "/homework?group=g1",
    );
    expect(screen.getByRole("link", { name: "Revision" })).toHaveAttribute(
      "href",
      "/homework?group=g2",
    );
  });

  it("keeps a view-all link to the homework page", () => {
    render(
      <MemoryRouter>
        <OverdueHomeworksCard
          items={[
            {
              id: "h1",
              groupId: "g1",
              title: "Worksheet 4",
              groupName: "Group A",
              dueDate: "2026-08-01",
              pending: 3,
            },
          ]}
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "View all" })).toHaveAttribute("href", "/homework");
  });

  it("shows no links when empty", () => {
    render(
      <MemoryRouter>
        <OverdueHomeworksCard items={[]} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("link")).toBeNull();
  });
});
