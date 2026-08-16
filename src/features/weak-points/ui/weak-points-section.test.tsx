import { beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "@/lib/theme/theme-provider";
import i18n from "@/lib/i18n";
import { WeakPointsSection } from "./weak-points-section";
import type { StudentWeakPoint } from "../application/weak-point-cases";

const rows: StudentWeakPoint[] = [
  {
    id: "wp-1",
    studentId: "s1",
    description: "long division",
    recordedOn: 1710000000000,
    resolved: false,
    createdAt: 1710000000000,
    updatedAt: 1710000000000,
  },
  {
    id: "wp-2",
    studentId: "s1",
    description: "word problems",
    recordedOn: 1710000000000,
    resolved: true,
    createdAt: 1710000000000,
    updatedAt: 1710000000000,
  },
];

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

describe("WeakPointsSection", () => {
  it("renders active and resolved weakness badges", () => {
    render(
      <ThemeProvider>
        <WeakPointsSection weakPoints={rows} onManage={() => {}} collapsed={false} onToggle={() => {}} />
      </ThemeProvider>,
    );
    expect(screen.getByText("long division")).toBeTruthy();
    expect(screen.getByText("word problems · 09-03-2024")).toBeTruthy();
  });

  it("shows the empty state when there are no weak points", () => {
    render(
      <ThemeProvider>
        <WeakPointsSection weakPoints={[]} onManage={() => {}} collapsed={false} onToggle={() => {}} />
      </ThemeProvider>,
    );
    expect(screen.getByText("No weak points recorded yet.")).toBeTruthy();
  });
});
