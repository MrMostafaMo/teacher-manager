import { useTranslation } from "react-i18next";
import { GraduationCap } from "lucide-react";
import { SupabaseChoiceCard } from "./SupabaseChoiceCard";
import { SkipLocalButton } from "./SkipLocalButton";

export default function LoginPage() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen">
      <div className="hidden flex-1 flex-col justify-between bg-[radial-gradient(900px_480px_at_90%_-10%,color-mix(in_oklch,var(--primary)_14%,transparent),transparent_70%),linear-gradient(180deg,var(--primary),var(--primary-strong))] p-10 text-primary-foreground lg:flex">
        <div className="flex items-center gap-3 text-lg font-semibold">
          <span className="flex size-10 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20 backdrop-blur">
            <GraduationCap className="size-5" />
          </span>
          Teacher Manager
        </div>
        <div className="space-y-3">
          <h1 className="font-heading text-3xl font-bold leading-tight">إدارة مركزك، بلا تعقيد</h1>
          <p className="max-w-md text-sm text-primary-foreground/80">سجّل بـ Supabase للمزامنة السحابية — أو تابع محلياً بدون حساب. بياناتك تبقى آمنة.</p>
        </div>
        <p className="text-xs text-primary-foreground/60">مزامنة اختيارية — تعمل بدون إنترنت</p>
      </div>
      <div className="flex flex-1 items-center justify-center bg-muted/30 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md space-y-4">
          <div className="text-center lg:text-start">
            <h1 className="text-2xl font-bold">{t("auth.login.title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("auth.login.subtitle")}</p>
          </div>
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <SupabaseChoiceCard />
          </div>
          <SkipLocalButton />
        </div>
      </div>
    </div>
  );
}
