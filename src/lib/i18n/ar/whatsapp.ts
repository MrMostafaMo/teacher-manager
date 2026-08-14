import type { Messages } from "@/lib/i18n/en";

export const whatsapp: Messages["whatsapp"] = {
  button: "واتساب",
  title: "إرسال رسالة واتساب",
  phone: "رقم الهاتف",
  phoneStudent: "رقم الطالب",
  phoneGuardian: "رقم ولي الأمر",
  noPhone: "لا يوجد رقم مسجل",
  phoneCustom: "رقم آخر…",
  phoneNumber: "رقم الهاتف",
  template: "القالب",
  message: "الرسالة",
  preview: "معاينة الرسالة",
  send: "فتح واتساب",
  sending: "جارٍ الفتح…",
  sent: "تم فتح واتساب في المتصفح",
  error: "تعذر فتح واتساب",
  insert: "إدراج متغير",
  variables: "المتغيرات",
  purposes: {
    general: "عام",
    homework: "الواجبات",
    exams: "الاختبارات",
    skills: "المهارات",
  },
  defaults: {
    general:
      "مرحبًا {name}! نود مشاركتكم تحديثًا عن مستوى الطالب في المركز. {group}. مع خالص التحية.",
    homework:
      "مرحبًا {name}! نسبة إنجاز الواجبات للطالب {homeworkRate}% ({homeworkDone} من {homeworkTotal} واجبات). مع خالص التحية.",
    exams:
      "مرحبًا {name}! متوسط درجات الطالب في الاختبارات {examAverage}% عبر {examsCount} اختبارات. مع خالص التحية.",
    skills:
      "مرحبًا {name}! تقييم مهارات الطالب: {skillsCount} مهارات تم تقييمها. المهارات الضعيفة: {weakSkills}. مع خالص التحية.",
  },
  varHints: {
    name: "اسم الطالب",
    group: "المجموعات",
    plan: "الخطة",
    date: "تاريخ اليوم",
    homeworkDone: "الواجبات المنجزة",
    homeworkTotal: "إجمالي الواجبات",
    homeworkRate: "نسبة إنجاز الواجبات %",
    examAverage: "متوسط درجات الاختبارات",
    examsCount: "عدد الاختبارات المصححة",
    weakSkills: "قائمة المهارات الضعيفة",
    strongSkills: "قائمة المهارات القوية",
    skillsCount: "عدد المهارات المقيمة",
  },
  settings: {
    title: "رسائل واتساب",
    hint: "قوالب الرسائل لإرسال تحديثات أداء الطالب عبر واتساب. المتغيرات مثل {name} تُستبدل تلقائيًا.",
    saved: "تم حفظ القالب",
    reset: "استعادة الافتراضي",
    resetDone: "تمت استعادة القالب الافتراضي",
    maxLength: "بحد أقصى 500 حرف",
  },
  save: "حفظ القالب",
};