import { useState } from "react";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { PageHeader } from "@/shared/PageHeader";
import { Segmented } from "@/shared/Segmented";
import { DailyView } from "./DailyView";
import { MonthlyView } from "./MonthlyView";

export default function AttendancePage() {
  const { t } = useTranslation();
  const [view, setView] = useState<"daily" | "monthly">("daily");
  const [date, setDate] = useState(() => dayjs().format("YYYY-MM-DD"));
  const [month, setMonth] = useState(() => dayjs().format("YYYY-MM"));

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("nav.attendance")}
        description={t("attendance.subtitle")}
        actions={
          <Segmented
            value={view}
            onChange={setView}
            options={(["daily", "monthly"] as const).map((v) => ({
              value: v,
              label: t(`attendance.${v}`),
            }))}
            ariaLabel={t("attendance.viewLabel")}
          />
        }
      />

      {view === "daily" ? (
        <DailyView date={date} onDateChange={setDate} />
      ) : (
        <MonthlyView month={month} onMonthChange={setMonth} />
      )}
    </div>
  );
}
