import { useTranslation } from "react-i18next";
import { WHATSAPP_VARIABLES } from "@/features/whatsapp/domain";

interface Props {
  onInsert: (variable: string) => void;
  className?: string;
}

/** Clickable `{var}` chips for every available WhatsApp variable. */
export function VariableChips({ onInsert, className }: Props) {
  const { t } = useTranslation();
  return (
    <div className={`flex flex-wrap gap-1.5 ${className ?? ""}`}>
      {WHATSAPP_VARIABLES.map((v) => (
        <button
          key={v}
          type="button"
          aria-label={`${t("whatsapp.insert")} {${v}}`}
          title={t(`whatsapp.varHints.${v}`)}
          className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground hover:border-ring hover:text-foreground"
          onClick={() => onInsert(v)}
        >
          {`{${v}}`}
        </button>
      ))}
    </div>
  );
}
