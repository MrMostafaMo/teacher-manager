import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmDeleteButton } from "./ConfirmDeleteButton";
import i18n from "@/lib/i18n";

beforeAll(async () => {
  await i18n.changeLanguage("en");
});

afterEach(() => cleanup());

describe("ConfirmDeleteButton", () => {
  it("renders a trash icon with the delete label when not armed", () => {
    render(
      <ConfirmDeleteButton
        armed={false}
        deleteLabel="Delete"
        confirmLabel="Confirm"
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Delete" })).toBeTruthy();
    expect(screen.queryByText("Are you sure?")).toBeNull();
  });

  it("shows the confirmation message and confirm button when armed", () => {
    render(
      <ConfirmDeleteButton
        armed={true}
        deleteLabel="Delete"
        confirmLabel="Confirm"
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText("Are you sure?")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeTruthy();
  });

  it("invokes onDelete from both states", async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <ConfirmDeleteButton
        armed={false}
        deleteLabel="Delete"
        confirmLabel="Confirm"
        onDelete={onDelete}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalledTimes(1);
    rerender(
      <ConfirmDeleteButton
        armed={true}
        deleteLabel="Delete"
        confirmLabel="Confirm"
        onDelete={onDelete}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onDelete).toHaveBeenCalledTimes(2);
  });
});
