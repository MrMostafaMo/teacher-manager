import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { getDashboardData } from "@/features/dashboard/application/dashboard-cases";
import DashboardPage from "./DashboardPage";
import i18n from "@/lib/i18n";

vi.mock("@/features/dashboard/application/dashboard-cases", () => ({
  getDashboardData: vi.fn(),
}));

beforeAll(async () => {
  await i18n.changeLanguage("en");
});

afterEach(cleanup);

describe("DashboardPage", () => {
  it("shows the underlying error details when loading fails", async () => {
    vi.mocked(getDashboardData).mockRejectedValueOnce(new Error("no such table: foo"));
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );
    expect(await screen.findByText("Failed to load dashboard")).toBeInTheDocument();
    expect(await screen.findByDisplayValue("no such table: foo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy Details" })).toBeInTheDocument();
  });
});
