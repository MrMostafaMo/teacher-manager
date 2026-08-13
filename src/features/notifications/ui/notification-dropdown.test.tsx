import { beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

vi.mock("@/features/notifications/application/notification-cases", () => ({
  refreshNotifications: vi.fn(async () => []),
}));

vi.mock("@/features/notifications/application/notification-query-cases", () => ({
  listActiveNotifications: vi.fn(async () => [
    {
      id: "a",
      type: "homework_overdue",
      key: "homework:h1",
      details: { title: "T", pending: 2 },
      read: false,
      dismissed: false,
      createdAt: 0,
      updatedAt: 0,
    },
  ]),
  unreadCount: vi.fn(async () => 1),
  markNotificationRead: vi.fn(async () => undefined),
  markAllNotificationsRead: vi.fn(async () => undefined),
  dismissNotification: vi.fn(async () => undefined),
  dismissAllNotifications: vi.fn(async () => undefined),
}));

import { NotificationDropdown } from "./notification-dropdown";
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

describe("NotificationDropdown", () => {
  it("shows the unread badge and lists notifications", async () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <NotificationDropdown />
        </ThemeProvider>
      </MemoryRouter>,
    );
    const bell = screen.getByRole("button", { name: /notifications/i });
    expect(bell.textContent).not.toContain("1");
    await userEvent.click(bell);
    await waitFor(() => {
      expect(screen.getByText(/overdue/i)).toBeTruthy();
      expect(bell.textContent).toContain("1");
    });
  });
});
