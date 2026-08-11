import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { ATTENDANCE_STATUSES } from "@/features/attendance/domain";
import type { Attendance } from "@/lib/db/schema";
import type { StudentMonthlyStat } from "@/features/attendance/infrastructure/attendance-repo";
import type { PaymentHistoryRow } from "@/features/payments/application/payment-cases";
import type { ProfileHomework } from "@/features/student-profile/application/student-profile-cases";
import { STATUS_BADGE, STATUS_LABEL } from "./profile-constants";
import { ProfileEmpty, ProfileSection, ProfileTable } from "./profile-section";
import { useAttendanceColumns, useHomeworkColumns, usePaymentColumns } from "./profile-columns-a";

export function AttendanceSection({
  rows,
  stats,
  rate,
}: {
  rows: Attendance[];
  stats: StudentMonthlyStat;
  rate: number | null;
}) {
  const { t } = useTranslation();
  const columns = useAttendanceColumns();
  return (
    <ProfileSection title={t("profile.sections.attendance")}>
      <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
        {ATTENDANCE_STATUSES.map((status) => (
          <Badge key={status} className={STATUS_BADGE[status]}>
            {t(STATUS_LABEL[status])}: {stats[status]}
          </Badge>
        ))}
        {rate !== null && (
          <Badge variant="outline">
            {t("profile.stats.attendanceRate")}: {rate}%
          </Badge>
        )}
      </div>
      {rows.length === 0 ? (
        <ProfileEmpty text={t("profile.empty.attendance")} />
      ) : (
        <ProfileTable<Attendance> columns={columns} rows={rows} getRowKey={(r) => r.id} />
      )}
    </ProfileSection>
  );
}

export function PaymentsSection({ rows }: { rows: PaymentHistoryRow[] }) {
  const { t } = useTranslation();
  const columns = usePaymentColumns();
  return (
    <ProfileSection title={t("profile.sections.payments")}>
      {rows.length === 0 ? (
        <ProfileEmpty text={t("profile.empty.payments")} />
      ) : (
        <ProfileTable<PaymentHistoryRow>
          columns={columns}
          rows={rows}
          getRowKey={({ payment }) => payment.id}
        />
      )}
    </ProfileSection>
  );
}

export function HomeworkSection({ rows }: { rows: ProfileHomework[] }) {
  const { t } = useTranslation();
  const columns = useHomeworkColumns();
  return (
    <ProfileSection title={t("profile.sections.homework")}>
      {rows.length === 0 ? (
        <ProfileEmpty text={t("profile.empty.homework")} />
      ) : (
        <ProfileTable<ProfileHomework> columns={columns} rows={rows} getRowKey={(h) => h.id} />
      )}
    </ProfileSection>
  );
}
