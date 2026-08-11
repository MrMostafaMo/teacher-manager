import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/shared/DatePicker";
import { Field } from "@/shared/Field";

export interface GroupFormState {
  name: string;
  subject: string;
  startsOn: string;
  status: "active" | "inactive";
  notes: string;
}

export function GroupFormFields({
  form,
  errors,
  onChange,
}: {
  form: GroupFormState;
  errors: Record<string, string>;
  onChange: (patch: Partial<GroupFormState>) => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <Field id="group-name" label={t("groups.fields.name")} required error={errors.name}>
        <Input
          id="group-name"
          value={form.name}
          onChange={(e) => onChange({ name: e.target.value })}
          aria-invalid={!!errors.name}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="group-subject" label={t("groups.fields.subject")} error={errors.subject}>
          <Input
            id="group-subject"
            value={form.subject}
            onChange={(e) => onChange({ subject: e.target.value })}
            aria-invalid={!!errors.subject}
          />
        </Field>
        <Field id="group-status" label={t("groups.fields.status")}>
          <Select
            id="group-status"
            value={form.status}
            onChange={(e) => onChange({ status: e.target.value as GroupFormState["status"] })}
          >
            <option value="active">{t("groups.statusActive")}</option>
            <option value="inactive">{t("groups.statusInactive")}</option>
          </Select>
        </Field>
      </div>

      <Field id="group-starts-on" label={t("groups.fields.startsOn")}>
        <DatePicker
          value={form.startsOn}
          onChange={(v) => onChange({ startsOn: v })}
          ariaLabel={t("groups.fields.startsOn")}
          className="w-full"
        />
        <p className="text-xs text-muted-foreground">{t("groups.startsOnHint")}</p>
      </Field>

      <Field id="group-notes" label={t("groups.fields.notes")} error={errors.notes}>
        <Textarea
          id="group-notes"
          value={form.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder={t("groups.notesPlaceholder")}
        />
      </Field>
    </>
  );
}
