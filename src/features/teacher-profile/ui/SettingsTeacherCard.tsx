import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field } from "@/shared/Field";
import { useToastStore } from "@/lib/toast-store";
import { ZodError } from "zod";
import { getTeacherProfile, upsertTeacherProfile } from "../application/teacher-profile-cases";

export function SettingsTeacherCard() {
  const { t } = useTranslation();
  const toast = useToastStore((s) => s.push);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getTeacherProfile().then((p) => setName(p?.name ?? ""));
  }, []);

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t("teacher.settings.required"));
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await upsertTeacherProfile({ name: trimmed });
      window.dispatchEvent(new Event("tm:data-changed"));
      toast({ message: t("teacher.settings.saved"), variant: "success" });
    } catch (error) {
      console.error("teacher save failed", error);
      if (error instanceof ZodError) {
        const issue = error.issues[0];
        if (issue?.path[0] === "name") setError(issue.message);
        else setError(t("teacher.settings.required"));
        return;
      }
      const msg = error instanceof Error ? error.message : "";
      if (msg.includes("no such table")) {
        toast({ message: "يجب إعادة تشغيل التطبيق لتطبيق التحديث — أغلق وأعد فتحه", variant: "error" });
      } else {
        toast({ message: t("common.retry"), variant: "error" });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <User className="size-4" />
          {t("teacher.settings.title")}
        </div>
        <p className="text-xs text-muted-foreground">{t("teacher.settings.description")}</p>
        <Field id="teacher-name" label={t("teacher.settings.nameLabel")} error={error ?? undefined}>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("teacher.settings.namePlaceholder")} />
        </Field>
        <Button onClick={() => void handleSave()} disabled={saving || !name.trim()}>
          {saving ? t("common.loading") : t("teacher.settings.save")}
        </Button>
      </CardContent>
    </Card>
  );
}
