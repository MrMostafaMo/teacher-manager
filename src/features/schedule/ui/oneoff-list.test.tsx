import { beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { SessionWithGroup } from "@/features/schedule/infrastructure/schedule-repo";
import { OneOffList } from "./oneoff-list";
import { ThemeProvider } from "@/lib/theme/theme-provider";
import i18n from "@/lib/i18n";

function oneOff(overrides: Partial<SessionWithGroup> = {}): SessionWithGroup {
  return {
    id: "o1",
    groupId: "g1",
    groupName: "Group",
    groupStatus: "active",
    groupStartsOn: null,
    dayOfWeek: 1,
    startTime: "12:00",
    endTime: "13:00",
    room: "R1",
    oneOffDate: "2026-09-14",
    movedFromSessionId: null,
    movedFromDate: null,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

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

describe("OneOffList", () => {
  it("renders nothing without one-offs", () => {
    const { container } = render(
      <ThemeProvider>
        <OneOffList oneOffs={[]} deletingId={null} onAttend={() => {}} onDelete={() => {}} />
      </ThemeProvider>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("lists one-off sessions with date, time and move origin", () => {
    const onAttend = vi.fn();
    render(
      <ThemeProvider>
        <OneOffList
          oneOffs={[
            oneOff(),
            oneOff({ id: "o2", oneOffDate: "2026-09-15", movedFromSessionId: "s", movedFromDate: "2026-09-13" }),
          ]}
          deletingId={null}
          onAttend={onAttend}
          onDelete={() => {}}
        />
      </ThemeProvider>,
    );
    expect(screen.getByText("Upcoming extra sessions")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Mark attendance" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Delete extra session" })).toHaveLength(2);
    expect(screen.getByText(/Moved from/)).toBeInTheDocument();
  });
});
