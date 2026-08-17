import type { Messages } from "@/lib/i18n/en";

export const dashboard: Messages["dashboard"] = {
  welcome: "أهلاً بك، أيها المعلم",
  subtitle: "لمحة عن مركزك — الطلاب والحضور والمدفوعات والواجبات.",
  loadError: "تعذّر تحميل لوحة التحكم",
  empty: "لا توجد بيانات بعد.",
  monthLabel: "البيانات المعروضة لشهر",
  selectMonth: "اختيار الشهر",
  quickActions: "إجراءات سريعة",
  quick: {
    students: "إضافة طالب",
    attendance: "تسجيل حضور",
    payments: "تسجيل دفعة",
    expenses: "إضافة مصروف",
  },
  newStudents: {
    label: "جدد هذا الشهر",
    suffix: "طالب",
  },
  kpis: {
    totalStudents: "إجمالي الطلاب",
    activeStudents: "طلاب نشطون",
    attendanceRate: "نسبة الحضور",
    collected: "المحصَّل (الشهر)",
    expensesMonth: "المصروفات (الشهر)",
    net: "الصافي (الشهر)",
    outstanding: "المديونية (الشهر)",
    homeworkCompletion: "إنجاز الواجبات",
    examAverage: "متوسط الدرجات",
  },
  charts: {
    attendance: "الحضور خلال آخر ٦ أشهر",
    homework: "حالة الواجبات",
    weakSkills: "أضعف المهارات",
    finance: "المالية خلال آخر ٦ أشهر",
    financeNet: "الصافي خلال آخر ٦ أشهر",
    collected: "المحصَّل",
    expenses: "المصروفات",
    net: "الصافي",
  },
  today: {
    title: "جلسات اليوم",
    empty: "لا توجد جلسات اليوم.",
    finished: "انتهت",
  },
  overdue: {
    title: "واجبات متأخرة",
    empty: "لا توجد واجبات متأخرة.",
    pending: "{{count}} لم يُسلّم",
    viewAll: "عرض الكل",
  },
  debtors: {
    title: "أعلى المديونين",
    empty: "لا توجد مديونيات مستحقة.",
  },
  weakPoints: {
    title: "نقاط ضعف الطلاب",
    empty: "لا توجد نقاط ضعف نشطة.",
    count: "{{count}} نشطة",
  },
};
