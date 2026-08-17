import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/shared/Field";

export const PHONE_SOURCES = ["student", "guardian", "custom"] as const;
export type PhoneSource = (typeof PHONE_SOURCES)[number];

interface Props {
  source: PhoneSource;
  customPhone: string;
  studentPhone: string;
  guardianPhone: string;
  onSourceChange: (source: PhoneSource) => void;
  onCustomPhoneChange: (phone: string) => void;
}

/** Phone picker: student / guardian / custom, with a free-text input for custom. */
export function PhonePicker({
  source,
  customPhone,
  studentPhone,
  guardianPhone,
  onSourceChange,
  onCustomPhoneChange,
}: Props) {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      <Field label={t("whatsapp.phone")} id="wa-phone-source">
        <Select
          id="wa-phone-source"
          value={source}
          onChange={(e) => onSourceChange(e.target.value as PhoneSource)}
        >
          <option value="student" disabled={!studentPhone}>
            {studentPhone ? studentPhone : t("whatsapp.noPhone")}
          </option>
          <option value="guardian" disabled={!guardianPhone}>
            {guardianPhone ? guardianPhone : t("whatsapp.noPhone")}
          </option>
          <option value="custom">{t("whatsapp.phoneCustom")}</option>
        </Select>
      </Field>

      {source === "custom" && (
        <Field label={t("whatsapp.phoneNumber")} id="wa-phone">
          <Input
            id="wa-phone"
            value={customPhone}
            onChange={(e) => onCustomPhoneChange(e.target.value)}
            placeholder="+20 …"
            dir="ltr"
          />
        </Field>
      )}
    </div>
  );
}
