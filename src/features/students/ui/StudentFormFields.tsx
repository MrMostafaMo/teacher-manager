import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { GroupWithCount } from "@/features/groups/infrastructure/group-repo";
import type { Plan } from "@/lib/db/schema";
import { DatePicker } from "@/shared/DatePicker";
import { Field } from "@/shared/Field";
import type { StudentFormState } from "./student-form";

export function StudentFormFields({
  form,
  errors,
  plans,
  groups,
  onChange,
}: {
  form: StudentFormState;
  errors: Record<string, string>;
  plans: Plan[];
  groups: GroupWithCount[];
  onChange: <K extends keyof StudentFormState>(key: K, value: StudentFormState[K]) => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <Field id="student-name" label={t("students.fields.name")} required error={errors.name}>
        <Input
          id="student-name"
          value={form.name}
          onChange={(e) => onChange("name", e.target.value)}
          aria-invalid={!!errors.name}
        />
      </Field>

      <Field id="student-enrolled-on" label={t("students.fields.enrolledOn")} error={errors.enrolledOn}>
        <DatePicker
          value={form.enrolledOn}
          onChange={(v) => onChange("enrolledOn", v)}
          ariaLabel={t("students.fields.enrolledOn")}
          className="w-full"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="student-phone" label={t("students.fields.phone")} error={errors.phone}>
          <Input
            id="student-phone"
            dir="ltr"
            value={form.phone}
            onChange={(e) => onChange("phone", e.target.value)}
            aria-invalid={!!errors.phone}
          />
        </Field>
        <Field id="student-status" label={t("students.fields.status")}>
          <Select
            id="student-status"
            value={form.status}
            onChange={(e) => onChange("status", e.target.value as StudentFormState["status"])}
          >
            <option value="active">{t("students.statusActive")}</option>
            <option value="inactive">{t("students.statusInactive")}</option>
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="student-guardian-name" label={t("students.fields.guardianName")} error={errors.guardianName}>
          <Input
            id="student-guardian-name"
            value={form.guardianName}
            onChange={(e) => onChange("guardianName", e.target.value)}
            aria-invalid={!!errors.guardianName}
          />
        </Field>
        <Field id="student-guardian-phone" label={t("students.fields.guardianPhone")} error={errors.guardianPhone}>
          <Input
            id="student-guardian-phone"
            dir="ltr"
            value={form.guardianPhone}
            onChange={(e) => onChange("guardianPhone", e.target.value)}
            aria-invalid={!!errors.guardianPhone}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="student-plan" label={t("students.fields.plan")}>
          <Select
            id="student-plan"
            value={form.planId}
            onChange={(e) => onChange("planId", e.target.value)}
          >
            <option value="">{t("students.noPlan")}</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.amount}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="student-class" label={t("students.fields.class")}>
          <Select
            id="student-class"
            value={form.groupId}
            onChange={(e) => onChange("groupId", e.target.value)}
          >
            <option value="">{t("students.noClass")}</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field id="student-notes" label={t("students.fields.notes")} error={errors.notes}>
        <Textarea
          id="student-notes"
          value={form.notes}
          onChange={(e) => onChange("notes", e.target.value)}
          placeholder={t("students.notesPlaceholder")}
        />
      </Field>
    </>
  );
}
