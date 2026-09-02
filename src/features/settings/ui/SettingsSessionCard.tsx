import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Clock3 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SettingsCardShell } from "@/shared/SettingsCardShell";
import { useSessionSettings } from "@/lib/session-settings-store";

export function SettingsSessionCard() {
  const { t } = useTranslation();
  const billingMode = useSessionSettings((s) => s.billingMode);
  const sessionsPerCycle = useSessionSettings((s) => s.sessionsPerCycle);
  const warningAt = useSessionSettings((s) => s.warningAt);
  const setBillingMode = useSessionSettings((s) => s.setBillingMode);
  const setSessionsPerCycle = useSessionSettings((s) => s.setSessionsPerCycle);
  const setWarningAt = useSessionSettings((s) => s.setWarningAt);

  const [sVal, setSVal] = useState(String(sessionsPerCycle));
  const [wVal, setWVal] = useState(String(warningAt));
  const [err, setErr] = useState("");

  useEffect(() => setSVal(String(sessionsPerCycle)), [sessionsPerCycle]);
  useEffect(() => setWVal(String(warningAt)), [warningAt]);

  function apply() {
    const s = Number(sVal);
    const w = Number(wVal);
    if (!Number.isInteger(s) || s < 1 || s > 30 || !Number.isInteger(w) || w < 1 || w >= s) {
      setErr(t("settings.session.validation"));
      return;
    }
    setErr("");
    setSessionsPerCycle(s);
    setWarningAt(w);
  }

  return (
    <SettingsCardShell
      icon={Clock3}
      title={t("settings.session.title")}
      description={t("settings.session.hint")}
    >
      <div className="grid gap-3 rounded-xl bg-muted/40 p-3 ring-1 ring-border/50 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="ss-m">{t("settings.session.billingMode", "نظام المحاسبة")}</Label>
          <Select
            id="ss-m"
            value={billingMode}
            onChange={(e) => setBillingMode(e.target.value as "calendar" | "sessions")}
          >
            <option value="calendar">{t("settings.session.modeCalendar", "بالشهر (تقويم)")}</option>
            <option value="sessions">{t("settings.session.modeSessions", "بعدد الحصص (دورات)")}</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ss-s">{t("settings.session.sessionsPerCycle")}</Label>
          <Input id="ss-s" type="number" min={1} max={30} value={sVal} onChange={(e) => setSVal(e.target.value)} onBlur={apply} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ss-w">{t("settings.session.warningAt")}</Label>
          <Input id="ss-w" type="number" min={1} max={30} value={wVal} onChange={(e) => setWVal(e.target.value)} onBlur={apply} />
        </div>
      </div>
      {err && <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive ring-1 ring-destructive/20">{err}</p>}
    </SettingsCardShell>
  );
}
