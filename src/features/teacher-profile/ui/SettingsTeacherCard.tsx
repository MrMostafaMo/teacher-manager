import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/shared/Field";
import { SettingsCardShell } from "@/shared/SettingsCardShell";
import { useToastStore } from "@/lib/toast-store";
import { ZodError } from "zod";
import { getTeacherProfile, upsertTeacherProfile } from "../application/teacher-profile-cases";

export function SettingsTeacherCard() {
  const { t } = useTranslation();
  const toast = useToastStore((s) => s.push);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getTeacherProfile().then((p) => setName(p?.name ?? ""));
  }, []);

  useEffect(() => {
    if (!saved) return;
    const id = window.setTimeout(() => setSaved(false), 2000);
    return () => window.clearTimeout(id);
  }, [saved]);

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
      setSaved(true);
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
    <SettingsCardShell icon={User} title={t("teacher.settings.title")} description={t("teacher.settings.description")}>
      <div className="space-y-3">
        <Field id="teacher-name" label={t("teacher.settings.nameLabel")} error={error ?? undefined}>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("teacher.settings.namePlaceholder")} />
        </Field>
        <Button onClick={() => void handleSave()} disabled={saving || !name.trim()} className="gap-1.5">
          {saved && <Check className="size-4" />}
          {saving ? t("common.loading") : saved ? t("common.saved") : t("teacher.settings.save")}
        </Button>
      </div>
    </SettingsCardShell>
  );
}
