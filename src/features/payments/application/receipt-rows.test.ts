import { describe, expect, it } from "vitest";
import { receiptRows } from "./receipt-rows";

const labels = {
  student: "الطالب",
  plan: "الخطة",
  period: "الفترة",
  method: "طريقة الدفع",
  date: "التاريخ",
  note: "ملاحظات",
  amount: "المبلغ",
};

describe("receiptRows", () => {
  it("builds rows in display order with the amount highlighted", () => {
    const rows = receiptRows({
      labels,
      studentName: "أحمد",
      planName: "شهري",
      period: "2026-07",
      note: null,
      method: "نقدًا",
      date: "12-07-2026",
      amount: "500 ج.م",
    });
    expect(rows.map((r) => r.label)).toEqual([
      "الطالب",
      "الخطة",
      "الفترة",
      "طريقة الدفع",
      "التاريخ",
      "المبلغ",
      "ملاحظات",
    ]);
    expect(rows[5]).toEqual({
      label: "المبلغ",
      value: "500 ج.م",
      highlight: true,
    });
  });

  it("uses em-dash fallbacks for null plan/period/note", () => {
    const rows = receiptRows({
      labels,
      studentName: "سارة",
      planName: null,
      period: null,
      note: null,
      method: "تحويل",
      date: "01-01-2026",
      amount: "100 ج.م",
    });
    expect(rows[1].value).toBe("—");
    expect(rows[2].value).toBe("—");
    expect(rows[6].value).toBe("—");
  });

  it("keeps provided note and amount values verbatim", () => {
    const rows = receiptRows({
      labels,
      studentName: "مريم",
      planName: "فصل",
      period: "2026-08",
      note: "دفعة أولى",
      method: "بطاقة",
      date: "02-08-2026",
      amount: "1,200 ج.م",
    });
    expect(rows[3].value).toBe("بطاقة");
    expect(rows[6].value).toBe("دفعة أولى");
  });
});