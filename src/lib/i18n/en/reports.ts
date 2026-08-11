export const reports = {
    subtitle: "Build tables over your data and export them to Excel or PDF.",
    exportExcel: "Export Excel",
    exportPdf: "Export PDF",
    exporting: "Exporting…",
    saved: "Report saved",
    empty: "No data for this report yet.",
    loadError: "Could not build the report",
    exportError: "Could not export the report",
    generated: "Generated {{date}}",
    types: {
      students: {
        label: "Students",
        title: "Students Report",
        headers: ["Name", "Phone", "Guardian", "Plan", "Groups", "Status"],
      },
      attendance: {
        label: "Attendance",
        title: "Attendance Report",
        headers: ["Student", "Present", "Absent", "Late", "Excused", "Total"],
      },
      exams: {
        label: "Exams",
        title: "Exams Report",
        headers: ["Exam", "Group", "Date", "Max score", "Completion", "Average", "Pass rate"],
      },
      payments: {
        label: "Payments",
        title: "Payments Report",
        headers: ["Student", "Plan amount", "Paid", "Balance"],
      },
      expenses: {
        label: "Expenses",
        title: "Expenses Report",
        headers: ["Date", "Title", "Category", "Amount", "Note"],
      },
      finances: {
        label: "Financial Summary",
        title: "Financial Report",
        headers: ["Month", "Collected", "Expenses", "Net"],
      },
      skills: {
        label: "Skills",
        title: "Skills Report",
        headers: ["Student", "Tracked", "Weak", "Weak skills"],
      },
    },
} as const;
