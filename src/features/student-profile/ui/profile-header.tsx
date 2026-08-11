import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowRight, Pencil, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/shared/Avatar";
import { PageHeader } from "@/shared/PageHeader";
import { StatusBadge } from "@/features/students/ui/StatusBadge";
import { formatDateString } from "@/lib/utils/format";
import type { Student } from "@/lib/db/schema";

interface ProfileHeaderProps {
  student: Student;
  onEdit: () => void;
  onStatement: () => void;
}

export function ProfileHeader({ student, onEdit, onStatement }: ProfileHeaderProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      <Link
        to="/students"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowRight className="size-4 rtl:rotate-180" />
        {t("profile.back")}
      </Link>

      <PageHeader
        title={student.name}
        description={
          student.enrolledOn
            ? `${t("students.registered")} ${formatDateString(student.enrolledOn)}`
            : undefined
        }
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={onEdit}>
              <Pencil className="size-4" />
              {t("students.edit")}
            </Button>
            <Button size="sm" variant="outline" onClick={onStatement}>
              <ReceiptText className="size-4" />
              {t("profile.statement.open")}
            </Button>
            <Avatar name={student.name} className="size-9 text-xs" />
            <StatusBadge status={student.status} />
          </div>
        }
      />
    </div>
  );
}
