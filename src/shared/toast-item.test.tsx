import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastItem } from "./toast-item";
import i18n from "@/lib/i18n";

beforeAll(async () => {
  await i18n.changeLanguage("en");
});

afterEach(() => cleanup());

const baseToast = {
  id: 1,
  variant: "info" as const,
  message: "Deleted",
  description: "Expense: Books",
  duration: 5000,
};

describe("ToastItem", () => {
  it("renders message, description and the action pill", () => {
    render(
      <ToastItem
        toast={{ ...baseToast, action: { label: "Undo", onPress: vi.fn() } }}
        onDismiss={vi.fn()}
      />,
    );
    expect(screen.getByText("Deleted")).toBeTruthy();
    expect(screen.getByText("Expense: Books")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Undo" })).toBeTruthy();
  });

  it("fires the action then dismisses when the pill is pressed", async () => {
    const onPress = vi.fn();
    const onDismiss = vi.fn();
    const user = userEvent.setup();
    render(
      <ToastItem
        toast={{ ...baseToast, action: { label: "Undo", onPress } }}
        onDismiss={onDismiss}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("dismisses from the close button", async () => {
    const onDismiss = vi.fn();
    const user = userEvent.setup();
    render(<ToastItem toast={baseToast} onDismiss={onDismiss} />);
    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("renders no action button when the toast has no action", () => {
    render(<ToastItem toast={baseToast} onDismiss={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
  });

  it("renders the countdown bar with the toast duration", () => {
    render(<ToastItem toast={baseToast} onDismiss={vi.fn()} />);
    const bar = document.querySelector('[data-testid="toast-countdown"]') as HTMLElement;
    expect(bar).not.toBeNull();
    expect(bar.style.animationDuration).toBe("5000ms");
  });

  it("skips the countdown bar when no duration is set", () => {
    render(<ToastItem toast={{ ...baseToast, duration: undefined }} onDismiss={vi.fn()} />);
    expect(document.querySelector('[data-testid="toast-countdown"]')).toBeNull();
  });
});
