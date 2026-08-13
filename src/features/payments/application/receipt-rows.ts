/** A single receipt field: label on the right (RTL) + value, optional big. */
export interface ReceiptLine {
  label: string;
  value: string;
  /** Rendered larger (the amount row). */
  highlight?: boolean;
}

export interface ReceiptLabels {
  student: string;
  plan: string;
  period: string;
  method: string;
  date: string;
  note: string;
  amount: string;
}

/** Build the receipt's field list, in display order, with fallbacks for nulls. */
export function receiptRows(input: {
  labels: ReceiptLabels;
  studentName: string;
  planName: string | null;
  period: string | null;
  note: string | null;
  method: string;
  date: string;
  amount: string;
}): ReceiptLine[] {
  return [
    { label: input.labels.student, value: input.studentName },
    { label: input.labels.plan, value: input.planName ?? "—" },
    { label: input.labels.period, value: input.period ?? "—" },
    { label: input.labels.method, value: input.method },
    { label: input.labels.date, value: input.date },
    { label: input.labels.amount, value: input.amount, highlight: true },
    { label: input.labels.note, value: input.note ?? "—" },
  ];
}