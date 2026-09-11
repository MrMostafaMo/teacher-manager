import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { LegendDot, RechartsTooltip } from "./chart-legend";

describe("LegendDot", () => {
  it("renders the given color", () => {
    const { container } = render(<LegendDot color="var(--chart-1)" />);
    expect(container.firstChild).toHaveStyle({ backgroundColor: "var(--chart-1)" });
  });
});

describe("RechartsTooltip", () => {
  it("renders nothing when inactive", () => {
    const { container } = render(<RechartsTooltip active={false} payload={[{ name: "x", value: 1 }]} />);
    expect(container.firstChild).toBeNull();
  });

  it("uses the formatter for numeric values", () => {
    render(
      <RechartsTooltip
        active
        label="Jan"
        payload={[{ dataKey: "v", name: "مصروفات", value: 1500, color: "red" }]}
        format={(v) => `${v} ج.م`}
      />,
    );
    expect(screen.getByText("1500 ج.م")).toBeInTheDocument();
  });
});
