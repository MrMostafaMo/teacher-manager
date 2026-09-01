import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToastStore } from "@/lib/toast-store";
import {
  configureSupabase,
  supabaseSignIn,
  supabaseSignUp,
  supabasePasswordReset,
  supabaseResendConfirmation,
} from "../application/supabase-auth";
import { refreshSyncUi } from "./sync-events";

const isManagedConfig = Boolean(import.meta.env.VITE_SUPABASE_URL);

export function SupabaseLoginForm() {
  const { t } = useTranslation();
  const toast = useToastStore((s) => s.push);
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [key, setKey] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<string | null>(null);
  const [mode, setMode] = useState<"in" | "up">("in");

  async function handleAuth() {
    if (!email.trim() || password.length < 6) {
      toast({ message: t("auth.login.error"), variant: "error" });
      return;
    }
    setBusy(true);
    try {
      if (mode === "up") await supabaseSignUp(email.trim(), password);
      else await supabaseSignIn(email.trim(), password);
      await refreshSyncUi();
      toast({ message: t("auth.login.connected"), variant: "success" });
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e ?? "");
      if (raw.includes("email_not_confirmed") && mode === "up") {
        setPendingConfirm(email.trim());
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
      toast({ message: `${t("auth.login.resetError")} — ${raw}`, variant: "error" });
    } finally {
      setResetBusy(false);
    }
  }

  async function handleResend() {
    const target = pendingConfirm ?? email.trim();
    if (!target) return;
    setResendBusy(true);
    try {
      await supabaseResendConfirmation(target, "signup");
      toast({ message: t("auth.login.resendSent"), variant: "success" });
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e ?? "");
      toast({ message: `${t("auth.login.resendError")} — ${raw}`, variant: "error" });
    } finally {
      setResendBusy(false);
    }
  }

  async function handleSaveConfig() {
    await configureSupabase(url, key);
    toast({ message: t("auth.login.connected"), variant: "success" });
    setUrl("");
    setKey("");
  }

  return (
    <div className="group relative overflow-hidden rounded-xl border bg-card/70 p-4 shadow-sm ring-1 ring-foreground/5 backdrop-blur-sm transition hover:shadow-md">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,color-mix(in_oklch,var(--success)_7%,transparent),transparent_65%)]" />
      <div className="relative space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold">{t("auth.login.supabaseTitle")}</div>
        <p className="text-xs text-muted-foreground">{t("auth.login.supabaseDesc")}</p>
        <div className="flex flex-col gap-2">
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("auth.login.emailPlaceholder")} dir="ltr" type="email" />
          <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("auth.login.passwordPlaceholder")} type="password" />
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
              <button type="button" onClick={() => void handleReset()} disabled={resetBusy || !email.trim()} className="text-xs text-muted-foreground underline disabled:opacity-50">
                {resetBusy ? t("auth.login.resetSending") : t("auth.login.forgotPassword")}
              </button>
              <span className="text-xs text-muted-foreground">·</span>
              <button type="button" onClick={() => void navigate("/reset-password")} className="text-xs text-muted-foreground underline">
                {t("auth.login.hasResetLink")}
              </button>
            </div>
          )}
          {pendingConfirm && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs">
              <p className="text-amber-800">{t("auth.login.checkEmail")}</p>
              <button type="button" onClick={() => void handleResend()} disabled={resendBusy} className="mt-1 text-xs font-medium text-amber-900 underline disabled:opacity-50">
                {resendBusy ? t("auth.login.resendSending") : t("auth.login.resend")}
              </button>
            </div>
          )}
        </div>
        {!isManagedConfig && (
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground underline">{t("sync.settings.helpLink")}</summary>
            <div className="mt-2 space-y-2">
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://xxx.supabase.co" dir="ltr" />
              <Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="anon key" dir="ltr" />
              <Button size="sm" variant="outline" onClick={() => void handleSaveConfig()} disabled={!url.trim() || !key.trim()}>
                {t("common.save")}
              </Button>
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
