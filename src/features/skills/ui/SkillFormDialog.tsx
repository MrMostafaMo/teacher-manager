import { useEffect, useState, type FormEvent } from "react";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { useTranslation } from "react-i18next";
import { ZodError } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { skillInputSchema } from "@/features/skills/domain";
import { Field } from "@/shared/Field";
import { createSkill, updateSkill } from "@/features/skills/application/skill-cases";
import type { Skill } from "@/lib/db/schema";
import { Modal } from "@/shared/Modal";
import { toast } from "@/lib/toast-store";

interface SkillFormDialogProps {
  open: boolean;
  skill: Skill | null;
  onClose: () => void;
  onSaved: () => void;
}

export function SkillFormDialog({ open, skill, onClose, onSaved }: SkillFormDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(skill?.name ?? "");
      setErrors({});
      }
  }, [open, skill]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setErrors({});
    try {
      skillInputSchema.parse({ name });
      if (skill) await updateSkill(skill.id, { name });
      else await createSkill({ name });
      onSaved();
      onClose();
    } catch (error) {
      if (error instanceof ZodError) {
        setErrors({ name: t("skills.errors.nameRequired") });
      } else {
        toast(getErrorMessage(error), "error");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={skill ? t("skills.edit") : t("skills.add")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field id="skill-name" label={t("skills.fields.name")} required error={errors.name}>
          <Input
            id="skill-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>

        

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            {t("skills.cancel")}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? t("skills.saving") : t("skills.save")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
