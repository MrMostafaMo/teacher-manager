import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Clock3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSessionSettings } from "@/lib/session-settings-store";

export function SettingsSessionCard() {
  const { t } = useTranslation();
  const sessionsPerCycle = useSessionSettings((s) => s.sessionsPerCycle);
  const warningAt = useSessionSettings((s) => s.warningAt);
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
    window.dispatchEvent(new CustomEvent("tm:data-changed"));
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Clock3 className="size-4" />
          {t("settings.session.title")}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ss-s">{t("settings.session.sessionsPerCycle")}</Label>
            <Input id="ss-s" type="number" min={1} max={30} value={sVal} onChange={(e) => setSVal(e.target.value)} onBlur={apply} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ss-w">{t("settings.session.warningAt")}</Label>
            <Input id="ss-w" type="number" min={1} max={30} value={wVal} onChange={(e) => setWVal(e.target.value)} onBlur={apply} />
          </div>
        </div>
        {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
        <p className="mt-2 text-xs text-muted-foreground">{t("settings.session.hint")}</p>
      </CardContent>
    </Card>
  );
}
