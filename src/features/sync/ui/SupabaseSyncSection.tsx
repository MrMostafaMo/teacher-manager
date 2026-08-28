import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Database, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToastStore } from "@/lib/toast-store";
import { configureSupabase, supabaseSignIn, supabaseSignOut, supabaseSignUp } from "../application/supabase-auth";
import { refreshSyncUi } from "./sync-events";
import { useSyncStore } from "./sync-store";

export function SupabaseSyncSection() {
  const { t } = useTranslation();
  const toast = useToastStore((s) => s.push);
  const supabaseEmail = useSyncStore((s) => s.supabaseEmail);
  const [url, setUrl] = useState("");
  const [key, setKey] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"in" | "up">("in");

  async function handleAuth() {
    if (!loginEmail.trim() || password.length < 6) {
      toast({ message: t("auth.login.error"), variant: "error" });
      return;
    }
    setBusy(true);
    try {
      if (mode === "up") await supabaseSignUp(loginEmail.trim(), password);
      else await supabaseSignIn(loginEmail.trim(), password);
      await refreshSyncUi();
      toast({ message: t("auth.login.connected"), variant: "success" });
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e ?? "");
      const isConfig = raw.includes("supabase not configured") || raw.includes("not configured");
      const msg = isConfig ? t("auth.login.needConfig") : `${t("auth.login.error")} — ${raw}`;
      toast({ message: msg, variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function handleDisconnect() {
    if (!window.confirm(t("common.confirmMessage"))) return;
    await supabaseSignOut();
    await refreshSyncUi();
    toast({ message: t("sync.settings.disconnected"), variant: "info" });
  }

  async function handleSaveConfig() {
    await configureSupabase(url, key);
    toast({ message: t("auth.login.connected"), variant: "success" });
    setUrl("");
    setKey("");
  }

  if (supabaseEmail) {
    return (
      <div className="space-y-2 rounded-xl border bg-card/70 p-4 shadow-sm ring-1 ring-foreground/5 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="flex size-8 items-center justify-center rounded-lg bg-success/10 text-success ring-1 ring-success/20">
            <Database className="size-4" />
          </span>
          Supabase
          <span className="ms-auto rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-medium text-success">متصل</span>
        </div>
        <p className="text-sm font-medium" dir="ltr">
          {supabaseEmail}
        </p>
        <Button variant="ghost" size="sm" onClick={() => void handleDisconnect()}>
          <LogOut className="size-4" /> {t("sync.settings.disconnect")}
        </Button>
      </div>
    );
  }

  return (
    <div className="group relative overflow-hidden rounded-xl border bg-card/70 p-4 shadow-sm ring-1 ring-foreground/5 backdrop-blur-sm transition hover:shadow-md">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,color-mix(in_oklch,var(--success)_7%,transparent),transparent_65%)]" />
      <div className="relative space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="flex size-8 items-center justify-center rounded-lg bg-success/10 text-success ring-1 ring-success/20">
            <Database className="size-4" />
          </span>
          Supabase
        </div>
        <p className="text-xs text-muted-foreground">{t("auth.login.supabaseDesc")}</p>
        <div className="flex flex-col gap-2">
          <Input value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder={t("auth.login.emailPlaceholder")} dir="ltr" type="email" />
          <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("auth.login.passwordPlaceholder")} type="password" />
          <div className="flex gap-2">
            <Button onClick={() => void handleAuth()} disabled={busy} className="flex-1">
              {busy ? t("auth.login.signingIn") : mode === "in" ? t("auth.login.signIn") : t("auth.login.signUp")}
            </Button>
            <Button variant="outline" onClick={() => setMode((m) => (m === "in" ? "up" : "in"))} disabled={busy}>
              {mode === "in" ? t("auth.login.signUp") : t("auth.login.signIn")}
            </Button>
          </div>
        </div>
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground underline">{t("sync.settings.helpLink")}</summary>
          <div className="mt-2 space-y-2">
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://xxx.supabase.co" dir="ltr" />
            <Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="anon key" dir="ltr" />
            <Button size="sm" variant="outline" onClick={() => void handleSaveConfig()} disabled={!url.trim() || !key.trim()}>
              حفظ
            </Button>
          </div>
        </details>
      </div>
    </div>
  );
}
