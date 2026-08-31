export interface DashboardData {
  totalStudents: number;
  activeStudents: number;
  attendanceRate: number;
  attendanceTrend: Array<{
    month: string;
    present: number;
    absent: number;
    late: number;
    excused: number;
  }>;
  financeTrend: Array<{ month: string; collected: number; expenses: number }>;
  collected: number;
  expensesMonth: number;
  net: number;
  outstanding: number;
  topDebtors: Array<{ id: string; name: string; remaining: number }>;
  deltas: {
    collected: number | null;
    expenses: number | null;
    net: number | null;
    attendanceRate: number | null;
    newStudents: number;
  };
  homeworkCompletion: number;
  homeworkCount: number;
  homeworkSubmitted: number;
  homeworkPending: number;
  homeworkLate: number;
  overdueHomeworks: Array<{
    id: string;
    groupId: string;
    title: string;
    groupName: string | null;
    dueDate: string | null;
    pending: number;
  }>;
  examAverage: number | null;
  weakSkills: Array<{ name: string; count: number }>;
  topWeakPoints: Array<{ id: string; name: string; count: number; latest: string }>;
  todaySessions: Array<{
    id: string;
    groupName: string;
    startTime: string;
    endTime: string;
    room: string | null;
    finished: boolean;
  }>;
  sessionDues: Array<{
    student: { id: string; name: string };
    count: number;
    remainingSessions: number;
    status: "ok" | "warning" | "due";
    isOverdue?: boolean;
    cyclesOverdue?: number;
    showPaid?: boolean;
  }>;
}
