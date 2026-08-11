import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { StudyGroup } from "@/lib/db/schema";
import { DatePicker } from "@/shared/DatePicker";
import { Field } from "@/shared/Field";

export interface ExamFormValues {
  groupId: string;
  title: string;
  maxScore: string;
  date: string;
}

interface ExamFormFieldsProps {
  form: ExamFormValues;
  errors: Record<string, string>;
  groups: StudyGroup[];
  setField: <K extends keyof ExamFormValues>(key: K, value: ExamFormValues[K]) => void;
}

export function ExamFormFields({ form, errors, groups, setField }: ExamFormFieldsProps) {
  const { t } = useTranslation();
  return (
    <>
      <Field id="exam-group" label={t("exams.fields.group")} required error={errors.groupId}>
        <Select
          id="exam-group"
          value={form.groupId}
          onChange={(e) => setField("groupId", e.target.value)}
          aria-invalid={!!errors.groupId}
        >
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field id="exam-title" label={t("exams.fields.title")} required error={errors.title}>
        <Input
          id="exam-title"
          value={form.title}
          onChange={(e) => setField("title", e.target.value)}
          aria-invalid={!!errors.title}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="exam-date" label={t("exams.fields.date")}>
          <DatePicker
            value={form.date}
            onChange={(v) => setField("date", v)}
            ariaLabel={t("exams.fields.date")}
            className="w-full"
          />
        </Field>
        <Field id="exam-max" label={t("exams.fields.maxScore")} error={errors.maxScore}>
          <Input
            id="exam-max"
            type="number"
            min={1}
            value={form.maxScore}
            onChange={(e) => setField("maxScore", e.target.value)}
            aria-invalid={!!errors.maxScore}
          />
        </Field>
      </div>
    </>
  );
}
