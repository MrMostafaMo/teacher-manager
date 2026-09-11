import { useTranslation } from "react-i18next";
import { Segmented } from "@/shared/Segmented";

export type ScheduleKind = "weekly" | "oneoff";

/** Weekly vs one-day switch at the top of the merged session dialog. */
export function ScheduleKindToggle({
  kind,
  onChange,
}: {
  kind: ScheduleKind;
  onChange: (kind: ScheduleKind) => void;
}) {
  const { t } = useTranslation();
  return (
    <Segmented
      value={kind}
      onChange={onChange}
      options={[
        { value: "weekly", label: t("schedule.type.weekly") },
        { value: "oneoff", label: t("schedule.type.oneoff") },
      ]}
      ariaLabel={t("schedule.type.label")}
    />
  );
}
