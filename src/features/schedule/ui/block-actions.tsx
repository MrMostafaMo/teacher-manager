import { useTranslation } from "react-i18next";
import { Ban, CalendarCheck, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BlockActionsProps {
  onOccurrence: () => void;
  onAttend: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

/** Hover action stack shown on a normal (non-cancelled) session block. */
export function BlockActions({ onOccurrence, onAttend, onEdit, onDelete }: BlockActionsProps) {
  const { t } = useTranslation();
  return (
    <div className="absolute end-1 top-1 z-10 flex flex-col gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
      <Button
        variant="ghost"
        size="icon-xs"
        className="bg-card/80 hover:bg-card"
        aria-label={t("schedule.exceptions.occurrence")}
        title={t("schedule.exceptions.occurrence")}
        onClick={onOccurrence}
      >
        <Ban />
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        className="bg-card/80 hover:bg-card"
        aria-label={t("schedule.attend")}
        title={t("schedule.attend")}
        onClick={onAttend}
      >
        <CalendarCheck />
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        className="bg-card/80 hover:bg-card"
        aria-label={t("schedule.edit")}
        title={t("schedule.edit")}
        onClick={onEdit}
      >
        <Pencil />
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        className="bg-card/80 hover:bg-card"
        aria-label={t("schedule.delete")}
        title={t("schedule.delete")}
        onClick={onDelete}
      >
        <Trash2 />
      </Button>
    </div>
  );
}
