import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportRosterPdf } from "@/features/attendance/application/roster-export";
import { toast } from "@/lib/toast-store";

/**
 * Exports the visible roster (name + status per student) as a printable A4
 * PDF through the native save dialog. Statuses arrive pre-localized; unmarked
 * students fall back to the "unmarked" label.
 */
export function PrintRosterButton({
  dateLabel,
  groupName,
  students,
  statuses,
  disabled,
}: {
  dateLabel: string;
  groupName: string;
  students: Array<{ id: string; name: string }>;
  statuses: Record<string, string | undefined>;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  async function handlePrint() {
    if (busy) return;
    setBusy(true);
    try {
      const rows = students.map((s) => ({
        name: s.name,
        status: statuses[s.id] ?? t("attendance.summary.unmarked"),
      }));
      const ok = await exportRosterPdf({
        title: t("attendance.rosterTitle"),
        subtitle: `${groupName} • ${dateLabel}`,
        rtl: true,
        nameHeader: t("attendance.columns.student"),
        statusHeader: t("attendance.columns.status"),
        rows,
      });
      if (ok) toast(t("attendance.rosterSaved"));
    } catch (e) {
      console.error("Failed to export roster", e);
      toast(t("attendance.rosterError"), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={disabled || busy}
      onClick={() => void handlePrint()}
    >
      <Printer />
      {busy ? t("attendance.rosterPrinting") : t("attendance.printRoster")}
    </Button>
  );
}
