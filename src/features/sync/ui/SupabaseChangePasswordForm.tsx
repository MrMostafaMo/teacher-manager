import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToastStore } from "@/lib/toast-store";
import { supabaseUpdatePassword } from "../application/supabase-auth";

export function SupabaseChangePasswordForm() {
  const { t } = useTranslation();
  const toast = useToastStore((s) => s.push);
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleChange() {
    if (newPassword.length < 6) {
      toast({ message: t("auth.reset.passwordTooShort"), variant: "error" });
      return;
    }
    if (newPassword !== confirm) {
      toast({ message: t("auth.reset.mismatch"), variant: "error" });
      return;
    }
    setBusy(true);
    try {
      await supabaseUpdatePassword(newPassword);
      toast({ message: t("auth.reset.success"), variant: "success" });
      setNewPassword("");
      setConfirm("");
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e ?? "");
      toast({ message: `${t("auth.reset.error")} — ${raw}`, variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 rounded-md border bg-muted/20 p-3">
      <p className="text-xs font-medium">{t("auth.reset.changeTitle")}</p>
      <Input
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        placeholder={t("auth.reset.newPasswordPlaceholder")}
        type="password"
      />
      <Input
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder={t("auth.reset.confirmPlaceholder")}
        type="password"
      />
      <Button size="sm" onClick={() => void handleChange()} disabled={busy || !newPassword || !confirm}>
        {busy ? t("auth.reset.saving") : t("auth.reset.save")}
      </Button>
    </div>
  );
}
