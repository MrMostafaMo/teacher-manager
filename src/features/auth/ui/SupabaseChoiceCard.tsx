import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToastStore } from "@/lib/toast-store";
import {
  supabaseSignIn,
  supabaseSignUp,
  supabasePasswordReset,
  supabaseResendConfirmation,
  mapAuthErrorToKey,
} from "@/features/sync/application/supabase-auth";
import { refreshSyncUi } from "@/features/sync/ui/sync-events";
import { passwordWeakReason } from "@/lib/validation";
import { SupabaseConfigRow } from "./SupabaseConfigRow";

const isManagedConfig = Boolean(import.meta.env.VITE_SUPABASE_URL);

export function SupabaseChoiceCard() {
  const { t } = useTranslation();
  const toast = useToastStore((s) => s.push);
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [pendingConfirmEmail, setPendingConfirmEmail] = useState<string | null>(null);
  const [mode, setMode] = useState<"in" | "up">("in");

  async function handleAuth() {
    if (!email.trim()) {
      toast({ message: t("auth.login.error"), variant: "error" });
      return;
    }
    if (mode === "up") {
      const reason = passwordWeakReason(password);
      if (reason) {
        toast({ message: t("auth.errors.weakPassword"), variant: "error" });
        return;
      }
    } else if (password.length < 6) {
      toast({ message: t("auth.login.error"), variant: "error" });
      return;
    }
    setBusy(true);
    try {
      if (mode === "up") await supabaseSignUp(email.trim(), password);
      else await supabaseSignIn(email.trim(), password);
      await refreshSyncUi();
      toast({ message: t("auth.login.connected"), variant: "success" });
      localStorage.removeItem("tm-auth-skipped");
      void navigate("/");
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e ?? "");
      const mappedKey = mapAuthErrorToKey(raw);
      if (mappedKey) {
        if (mappedKey === "auth.errors.notConfirmed" || raw.includes("email_not_confirmed")) {
          setPendingConfirmEmail(email.trim());
          toast({ message: t("auth.login.checkEmail"), variant: "info" });
          return;
        }
        toast({ message: t(mappedKey), variant: "error" });
        return;
      }
      const isConfirmRequired = raw.includes("email_not_confirmed");
      if (isConfirmRequired && mode === "up") {
        setPendingConfirmEmail(email.trim());
        toast({ message: t("auth.login.checkEmail"), variant: "info" });
        return;
      }
      const isConfig = raw.includes("supabase not configured") || raw.includes("not configured");
      const msg = isConfig ? t("auth.login.needConfig") : `${t("auth.login.error")} — ${raw}`;
      const hint = raw.toLowerCase().includes("email not confirmed") ? ` — ${t("auth.login.checkEmail")}` : "";
      toast({ message: msg + hint, variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function handleReset() {
    if (!email.trim()) {
      toast({ message: t("auth.login.emailPlaceholder"), variant: "error" });
      return;
    }
    setResetBusy(true);
    try {
      await supabasePasswordReset(email.trim());
      toast({ message: t("auth.login.resetSent"), variant: "success" });
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e ?? "");
      const mappedKey = mapAuthErrorToKey(raw);
      const msg = mappedKey ? t(mappedKey) : `${t("auth.login.resetError")} — ${raw}`;
      toast({ message: msg, variant: "error" });
    } finally {
      setResetBusy(false);
    }
  }

  async function handleResend() {
    const target = pendingConfirmEmail ?? email.trim();
    if (!target) return;
    setResendBusy(true);
    try {
      await supabaseResendConfirmation(target, "signup");
      toast({ message: t("auth.login.resendSent"), variant: "success" });
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e ?? "");
      const mappedKey = mapAuthErrorToKey(raw);
      const msg = mappedKey ? t(mappedKey) : `${t("auth.login.resendError")} — ${raw}`;
      toast({ message: msg, variant: "error" });
    } finally {
      setResendBusy(false);
    }
  }

  return (
    <Card className="group relative overflow-hidden rounded-xl border bg-card/70 shadow-sm ring-1 ring-foreground/5 backdrop-blur-sm transition hover:shadow-md">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,color-mix(in_oklch,var(--success)_7%,transparent),transparent_65%)]" />
      <CardContent className="relative p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="flex size-8 items-center justify-center rounded-lg bg-success/10 text-success ring-1 ring-success/20">
            <Database className="size-4" />
          </span>
          {t("auth.login.supabaseTitle")}
        </div>
        <p className="text-xs text-muted-foreground">{t("auth.login.supabaseDesc")}</p>
        <Input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("auth.login.emailPlaceholder")}
          dir="ltr"
          type="email"
        />
        <Input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t("auth.login.passwordPlaceholder")}
          type="password"
        />
        <div className="flex gap-2">
          <Button onClick={() => void handleAuth()} disabled={busy} className="flex-1">
            {busy ? t("auth.login.signingIn") : mode === "in" ? t("auth.login.signIn") : t("auth.login.signUp")}
          </Button>
          <Button variant="outline" onClick={() => setMode((m) => (m === "in" ? "up" : "in"))} disabled={busy}>
            {mode === "in" ? t("auth.login.signUp") : t("auth.login.signIn")}
          </Button>
        </div>
        {mode === "in" && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void handleReset()}
              disabled={resetBusy || !email.trim()}
              className="text-xs text-muted-foreground underline disabled:opacity-50"
            >
              {resetBusy ? t("auth.login.resetSending") : t("auth.login.forgotPassword")}
            </button>
            <span className="text-xs text-muted-foreground">·</span>
            <button
              type="button"
              onClick={() => void navigate("/reset-password")}
              className="text-xs text-muted-foreground underline"
            >
              {t("auth.login.hasResetLink")}
            </button>
          </div>
        )}
        {pendingConfirmEmail && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs">
            <p className="text-amber-800">{t("auth.login.checkEmail")}</p>
            <p className="mt-1 text-[11px] text-amber-700">{t("auth.login.checkEmailHint")}</p>
            <button
              type="button"
              onClick={() => void handleResend()}
              disabled={resendBusy}
              className="mt-1 text-xs font-medium text-amber-900 underline disabled:opacity-50"
            >
              {resendBusy ? t("auth.login.resendSending") : t("auth.login.resend")}
            </button>
          </div>
        )}
        {!isManagedConfig && <SupabaseConfigRow />}
      </CardContent>
    </Card>
  );
}
