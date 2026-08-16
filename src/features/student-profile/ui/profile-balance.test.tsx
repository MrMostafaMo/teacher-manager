import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { BalanceBadge } from "./profile-balance";
import i18n from "@/lib/i18n";

beforeAll(async () => {
  await i18n.changeLanguage("en");
});

afterEach(cleanup);

describe("BalanceBadge", () => {
  it("shows an amount due when the balance is positive", () => {
    render(<BalanceBadge balance={450} />);
    expect(screen.getByText(/Owes/)).toBeTruthy();
    expect(screen.getByText(/450/)).toBeTruthy();
  });

  it("shows a credit when the balance is negative", () => {
    render(<BalanceBadge balance={-120} />);
    expect(screen.getByText(/credit/)).toBeTruthy();
    expect(screen.getByText(/120/)).toBeTruthy();
  });

  it("shows settled when the balance is zero", () => {
    render(<BalanceBadge balance={0} />);
    expect(screen.getByText("Settled")).toBeTruthy();
  });
});
