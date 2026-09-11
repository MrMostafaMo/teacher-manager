import { useTranslation } from "react-i18next";
import type { SessionWithGroup } from "@/features/schedule/infrastructure/schedule-repo";
import type { GroupSession, StudyGroup } from "@/lib/db/schema";
import { formatDateString, formatTime } from "@/lib/utils/format";
import { useTimeStore } from "@/lib/time-store";

const DAY_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

interface GroupScheduleSummaryProps {
  group: StudyGroup;
  sessions: GroupSession[];
  extraSessions: SessionWithGroup[];
}

/** Timetable line for the group detail header (recurring + extra sessions). */
export function GroupScheduleSummary({ group, sessions, extraSessions }: GroupScheduleSummaryProps) {
  const { t } = useTranslation();
  const hour24 = useTimeStore((s) => s.hour24);
  return (
    <>
      {group.subject ? `${group.subject} · ` : ""}
      {group.startsOn
        ? `${t("groups.fields.startsOn")}: ${formatDateString(group.startsOn)} · `
        : ""}
      {sessions.length > 0
        ? sessions
            .map(
              (s) =>
                `${t(`schedule.days.${DAY_NAMES[s.dayOfWeek]}`)} ${formatTime(s.startTime, hour24)}–${formatTime(s.endTime, hour24)}`,
            )
            .join(" · ")
        : t("groups.noSchedule")}
      {extraSessions.length > 0 &&
        ` · ${t("schedule.exceptions.added")}: ${extraSessions
          .map(
            (s) =>
              `${s.oneOffDate ? formatDateString(s.oneOffDate) : ""} ${formatTime(s.startTime, hour24)}`,
          )
          .join(" · ")}`}
    </>
  );
}
