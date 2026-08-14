import { beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import type { Student } from "@/lib/db/schema";
import type { StudentProfileData } from "@/features/student-profile/application/student-profile-cases";

vi.mock("@/features/student-profile/application/student-profile-cases", () => ({
  getStudentProfile: vi.fn(async () => buildData()),
}));

const student: Student = {
  id: "s1",
  name: "أحمد",
  phone: "0100",
  guardianName: null,
  guardianPhone: null,
  notes: null,
  planId: null,
  status: "active",
  enrolledOn: "2026-08-01",
  createdAt: 1,
  updatedAt: 1,
};

function buildData(): StudentProfileData {
  return {
    student,
    planName: null,
    groups: [],
    attendanceStats: { studentId: "s1", present: 0, absent: 0, late: 0, excused: 0 },
    attendanceHistory: [],
    payments: [],
    homeworks: [],
    exams: [],
    sessionAttendance: [],
    skills: [],
    weakPoints: [],
    activity: [],
  };
}

import StudentProfilePage from "@/features/student-profile/ui/StudentProfilePage";
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

describe("StudentProfilePage", () => {
  it("renders the loaded profile without a hooks-order crash", async () => {
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={["/students/s1"]}>
          <Routes>
            <Route path="/students/:id" element={<StudentProfilePage />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>,
    );
    expect(await screen.findByText("أحمد")).toBeTruthy();
  });
});
