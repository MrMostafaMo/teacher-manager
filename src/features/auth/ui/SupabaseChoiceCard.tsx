import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToastStore } from "@/lib/toast-store";
import { supabaseSignIn, supabaseSignUp, configureSupabase } from "@/features/sync/application/supabase-auth";
import { refreshSyncUi } from "@/features/sync/ui/sync-events";

export function SupabaseChoiceCard() {
  const { t } = useTranslation();
  const toast = useToastStore((s) => s.push);
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
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
      localStorage.removeItem("tm-auth-skipped");
      void navigate("/");
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e ?? "");
      const isConfig = raw.includes("supabase not configured") || raw.includes("not configured");
      const msg = isConfig ? t("auth.login.needConfig") : `${t("auth.login.error")} — ${raw}`;
      toast({ message: msg, variant: "error" });
    } finally {
      setBusy(false);
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
        <SupabaseConfigRow />
      </CardContent>
    </Card>
  );
}

function SupabaseConfigRow() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [key, setKey] = useState("");

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs text-muted-foreground underline">
        {t("sync.settings.helpLink")}
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-md border p-2">
      <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://xxx.supabase.co" dir="ltr" />
      <Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="anon key" dir="ltr" />
      <Button
        size="sm"
        variant="outline"
        onClick={() => void configureSupabase(url, key).then(() => setOpen(false))}
        disabled={!url.trim() || !key.trim()}
      >
        {t("common.save")}
      </Button>
    </div>
  );
}
