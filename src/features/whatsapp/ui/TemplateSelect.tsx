import { useTranslation } from "react-i18next";
import { Select } from "@/components/ui/select";
import { WHATSAPP_PURPOSES, type WhatsAppTemplate } from "../domain";

interface Props {
  templates: WhatsAppTemplate[];
  value: string;
  onChange: (id: string) => void;
}

/** Template picker: options grouped by purpose (optgroup). */
export function TemplateSelect({ templates, value, onChange }: Props) {
  const { t } = useTranslation();
  return (
    <Select id="wa-template" value={value} onChange={(e) => onChange(e.target.value)}>
      {WHATSAPP_PURPOSES.map((purpose) => {
        const rows = templates.filter((row) => row.purpose === purpose);
        if (rows.length === 0) return null;
        return (
          <optgroup key={purpose} label={t(`whatsapp.purposes.${purpose}`)}>
            {rows.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </optgroup>
        );
      })}
    </Select>
  );
}
