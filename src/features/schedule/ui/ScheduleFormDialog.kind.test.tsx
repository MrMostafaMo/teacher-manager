import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ScheduleFormDialog } from "./ScheduleFormDialog";
import { ThemeProvider } from "@/lib/theme/theme-provider";
import i18n from "@/lib/i18n";

const groups = [{ id: "g1", name: "Group" } as never];

beforeAll(async () => {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute("open", "");
    };
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute("open");
    };
  }
  if (!window.matchMedia) {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  }
  await i18n.changeLanguage("en");
});

afterEach(cleanup);

function renderDialog() {
  return render(
    <ThemeProvider>
      <ScheduleFormDialog
        open
        session={null}
        groups={groups}
        onClose={() => {}}
        onSaved={() => {}}
      />
    </ThemeProvider>,
  );
}

describe("ScheduleFormDialog kind toggle", () => {
  it("offers weekly vs one-day choice when creating", () => {
    renderDialog();
    expect(screen.getByRole("group", { name: "Session type" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Weekly" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "One-day" })).toBeInTheDocument();
  });

  it("switches to the one-day date field instead of the weekday field", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole("button", { name: "One-day" }));
    expect(screen.getByLabelText("Date")).toBeInTheDocument();
    expect(screen.queryByLabelText("Day")).not.toBeInTheDocument();
  });
});
