import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { Users } from "lucide-react";
import { KpiGrid, type KpiItem } from "./dashboard-kpis";
import i18n from "@/lib/i18n";

function kpi(key: string, overrides: Partial<KpiItem> = {}): KpiItem {
  return { key, value: 5, icon: Users, ...overrides };
}

beforeAll(async () => {
  await i18n.changeLanguage("en");
});

afterEach(cleanup);

describe("KpiGrid", () => {
  it("renders each routed KPI as a link to its page", () => {
    render(
      <MemoryRouter>
        <KpiGrid
          kpis={[
            kpi("totalStudents", { to: "/students" }),
            kpi("collected", { to: "/payments" }),
            kpi("expensesMonth", { to: "/expenses" }),
          ]}
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "Total students" })).toHaveAttribute("href", "/students");
    expect(screen.getByRole("link", { name: "Collected (month)" })).toHaveAttribute("href", "/payments");
    expect(screen.getByRole("link", { name: "Expenses (month)" })).toHaveAttribute("href", "/expenses");
  });

  it("renders KPIs without a route as plain cards", () => {
    render(
      <MemoryRouter>
        <KpiGrid kpis={[kpi("examAverage")]} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Avg. score")).toBeTruthy();
  });
});
