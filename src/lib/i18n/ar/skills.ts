import type { Messages } from "@/lib/i18n/en";

export const skills: Messages["skills"] = {
    subtitle: "بناء دليل المهارات ومتابعة الإتقان لكل طالب.",
    add: "إضافة مهارة",
    edit: "تعديل مهارة",
    empty: "لا توجد مهارات بعد.",
    emptyHint: "أضف أول مهارة (مثل: جدول الضرب).",
    noSkills: "لا توجد مهارات في الدليل بعد.",
    fields: {
      name: "الاسم",
    },
    columns: {
      name: "المهارة",
      tracked: "الطلاب",
      weak: "نقاط الضعف",
    },
    weakCount: "{{count}} ضعيف",
    weakHint: "المهارات بمستوى ١–٢ تُعد نقاط ضعف.",
    summary: "{{tracked}} متابعة، {{weak}} ضعيفة",
    studentSkills: "المهارات — {{name}}",
    levelFor: "مستوى {{name}}",
    notePlaceholder: "ملاحظة",
    noteFor: "ملاحظة {{name}}",
    save: "حفظ",
    saving: "جارٍ الحفظ…",
    saved: "تم الحفظ",
    cancel: "إغلاق",
    delete: "حذف المهارة",
    confirmDelete: "اضغط مرة أخرى للتأكيد",
    deleteError: "تعذّر حذف المهارة",
    loadError: "تعذّر تحميل المهارات",
    saveError: "تعذّر حفظ المهارات",
    errors: {
      nameRequired: "الاسم مطلوب",
    },
};
