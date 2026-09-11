import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SessionContextMenu } from "./session-context-menu";
import { ThemeProvider } from "@/lib/theme/theme-provider";
import i18n from "@/lib/i18n";

beforeAll(async () => {
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

function renderMenu(onItem: (item: string) => void = () => {}) {
  return render(
    <ThemeProvider>
      <SessionContextMenu items={["attend", "edit", "delete"]} onItem={onItem}>
        <div data-testid="trigger">block</div>
      </SessionContextMenu>
    </ThemeProvider>,
  );
}

describe("SessionContextMenu", () => {
  it("keeps menu rows hidden until right-click", () => {
    renderMenu();
    expect(screen.queryByRole("menuitem", { name: "Mark attendance" })).not.toBeInTheDocument();
  });

  it("shows the block actions on right-click", () => {
    renderMenu();
    fireEvent.contextMenu(screen.getByTestId("trigger"));
    expect(screen.getByRole("menuitem", { name: "Mark attendance" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Edit session" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Delete session" })).toBeInTheDocument();
  });

  it("routes the picked row to onItem", () => {
    const onItem = vi.fn();
    renderMenu(onItem);
    fireEvent.contextMenu(screen.getByTestId("trigger"));
    fireEvent.click(screen.getByRole("menuitem", { name: "Mark attendance" }));
    expect(onItem).toHaveBeenCalledWith("attend");
  });
});
