import type { Messages } from "@/lib/i18n/en";

export const notifications: Messages["notifications"] = {
  title: "الإشعارات",
  empty: "لا توجد إشعارات",
  unread: "غير مقروء",
  markAllRead: "تحديد الكل كمقروء",
  dismissAll: "إخفاء الكل",
  dismiss: "إخفاء",
  types: {
    homework_overdue: "واجب «{{title}}» متأخر ({{pending}} بدون تسليم)",
    payment_overdue: "{{name}}: بقي عليه {{remaining}} عن {{period}}",
    exception: "{{kind}} بتاريخ {{date}}",
    weak_skill: "{{count}} طالب(ة) ضعيف في «{{name}}»",
    low_attendance: "نسبة حضور {{name}} {{rate}} هذا الشهر",
  },
};
