import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { CardLink } from "./CardLink";

afterEach(cleanup);

describe("CardLink", () => {
  it("renders an accessible whole-card link to the target page", () => {
    render(
      <MemoryRouter>
        <CardLink to="/homework" label="Overdue homeworks">
          <span>Card body</span>
        </CardLink>
      </MemoryRouter>,
    );
    const link = screen.getByRole("link", { name: "Overdue homeworks" });
    expect(link).toHaveAttribute("href", "/homework");
    expect(screen.getByText("Card body")).toBeTruthy();
  });
});
