/**
 * Reports feature. A report is a localized title + a flat table
 * (headers + string/number rows) that can be rendered on screen and
 * exported to Excel or PDF.
 */
export type ReportKey = "students" | "attendance" | "exams" | "payments" | "skills";

export interface ReportData {
  key: ReportKey;
  title: string;
  headers: string[];
  rows: (string | number)[][];
}
