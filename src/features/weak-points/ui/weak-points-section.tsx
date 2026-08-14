import { useTranslation } from "react-i18next";
import { TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProfileEmpty, ProfileSection } from "@/features/student-profile/ui/profile-section";
import { formatDate } from "@/lib/utils/format";
import type { StudentWeakPoint } from "../application/weak-point-cases";

/** Profile section: active weak points as red badges, resolved ones struck. */
export function WeakPointsSection({
  weakPoints,
  onManage,
}: {
  weakPoints: StudentWeakPoint[];
  onManage: () => void;
}) {
  const { t } = useTranslation();
  return (
    <ProfileSection title={t("profile.sections.weakPoints")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold">{t("profile.sections.weakPoints")}</h3>
        <Button size="sm" variant="outline" onClick={onManage}>
          <TriangleAlert className="size-4" />
          {t("profile.manageWeakPoints")}
        </Button>
      </div>
      {weakPoints.length === 0 ? (
        <ProfileEmpty text={t("weakPoints.empty")} />
      ) : (
        <div className="flex flex-wrap gap-2">
          {weakPoints.map((w) => (
            <Badge
              key={w.id}
              variant={w.resolved ? "secondary" : "destructive"}
              className={w.resolved ? "px-3 py-1 line-through opacity-60" : "px-3 py-1"}
            >
              {w.description}
              {w.resolved ? ` · ${formatDate(w.recordedOn)}` : ""}
            </Badge>
          ))}
        </div>
      )}
    </ProfileSection>
  );
}
