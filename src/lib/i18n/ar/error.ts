import type { Messages } from "@/lib/i18n/en";

export const error: Messages["error"] = {
  title: "حدث خطأ غير متوقع",
  description: "واجه التطبيق خطأ غير متوقع. بياناتك محفوظة محليًا وفي أمان.",
  copyDetails: "نسخ التفاصيل",
  tryAgain: "حاول مرة أخرى",
  dbHealthTitle: "قاعدة البيانات تحتاج مراجعة",
  dbHealthBody:
    "بعض جداول قاعدة البيانات ناقصة أو فشل فحص السلامة. بياناتك محفوظة محليًا — استعد من نسخة احتياطية لإصلاحها.",
  dbHealthMissing: "الجداول الناقصة",
  dbHealthSettings: "فتح إعدادات النسخ",
  dbRepaired: "تم إصلاح عناصر قاعدة البيانات: {{tables}}",
};
