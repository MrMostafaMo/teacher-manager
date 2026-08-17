import type { Messages } from "@/lib/i18n/en";

export const notifications: Messages["notifications"] = {
  title: "الإشعارات",
  empty: "لا توجد إشعارات",
  unread: "غير مقروء",
  markAllRead: "تحديد الكل كمقروء",
  dismissAll: "إخفاء الكل",
  dismiss: "إخفاء",
  mute: "كتم النوع",
  muted: "مكتم",
  settings: {
    title: "الإشعارات",
    master: "تشغيل الإشعارات",
    osBanners: "تنبيهات النظام",
    on: "تشغيل",
    off: "إيقاف",
    types: {
      homework: "واجبات متأخرة",
      payment: "دفعات مستحقة",
      exception: "استثناءات الجدول",
      weakSkill: "مهارات ضعيفة",
      lowAttendance: "حضور منخفض",
      exam: "امتحانات قادمة",
      birthday: "أعياد ميلاد",
    },
  },
  types: {
    homework_overdue: "واجب «{{title}}» متأخر ({{pending}} بدون تسليم)",
    payment_overdue: "{{name}}: بقي عليه {{remaining}} عن {{period}}",
    exception: "{{kind}} بتاريخ {{date}}",
    weak_skill: "{{count}} طالب(ة) ضعيف في «{{name}}»",
    low_attendance: "نسبة حضور {{name}} {{rate}} هذا الشهر",
    exam_upcoming: "امتحان «{{title}}» بتاريخ {{examDate}} ({{groupName}})",
    student_birthday: "🎂 عيد ميلاد {{name}} اليوم!",
  },
};
