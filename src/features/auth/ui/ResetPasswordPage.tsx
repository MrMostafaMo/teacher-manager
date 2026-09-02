import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToastStore } from "@/lib/toast-store";
import { supabaseUpdatePassword, mapAuthErrorToKey } from "@/features/sync/application/supabase-auth";
import { passwordWeakReason } from "@/lib/validation";

function extractRecoveryToken(): string | null {
  // Supabase sends #access_token=...&type=recovery after verify
  const hash = window.location.hash.slice(1);
  if (hash) {
    const params = new URLSearchParams(hash);
    const token = params.get("access_token");
    if (token) return token;
  }
  const search = new URLSearchParams(window.location.search);
  return search.get("token") ?? search.get("access_token") ?? null;
}

function extractTokenFromPastedUrl(input: string): string | null {
  try {
    const url = new URL(input.trim());
    const hash = url.hash.slice(1);
    if (hash) {
      const hp = new URLSearchParams(hash);
      const t = hp.get("access_token");
      if (t) return t;
    }
    return url.searchParams.get("token") ?? url.searchParams.get("access_token") ?? null;
  } catch {
    // Not a URL, assume raw token
    const t = input.trim();
    return t.length > 20 ? t : null;
  }
}

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const toast = useToastStore((s) => s.push);
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(() => extractRecoveryToken());
  const [pastedUrl, setPastedUrl] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (token) return;
    const t2 = extractRecoveryToken();
    if (t2) setToken(t2);
  }, [token]);

  async function handleSave() {
    const reason = passwordWeakReason(password);
    if (reason) {
      toast({ message: t("auth.errors.weakPassword"), variant: "error" });
      return;
    }
    if (password !== confirm) {
      toast({ message: t("auth.reset.mismatch"), variant: "error" });
      return;
    }
    if (!token) {
      toast({ message: t("auth.reset.needToken"), variant: "error" });
      return;
    }
    setBusy(true);
    try {
      await supabaseUpdatePassword(password, token);
      toast({ message: t("auth.reset.success"), variant: "success" });
      void navigate("/login");
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e ?? "");
      const mappedKey = mapAuthErrorToKey(raw);
      if (mappedKey) {
        toast({ message: t(mappedKey), variant: "error" });
        return;
      }
      toast({ message: `${t("auth.reset.error")} — ${raw}`, variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  function handleUsePasted() {
    const tkn = extractTokenFromPastedUrl(pastedUrl);
    if (!tkn) {
      toast({ message: t("auth.reset.invalidLink"), variant: "error" });
      return;
    }
    setToken(tkn);
    toast({ message: t("auth.reset.tokenCaptured"), variant: "success" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-4 p-6">
          <h1 className="text-xl font-bold">{t("auth.reset.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("auth.reset.desc")}</p>

          {!token && (
            <div className="space-y-2 rounded-md border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">{t("auth.reset.pasteHint")}</p>
              <Input
                value={pastedUrl}
                onChange={(e) => setPastedUrl(e.target.value)}
                placeholder="https://...#access_token=..."
                dir="ltr"
              />
              <Button size="sm" variant="outline" onClick={handleUsePasted} disabled={!pastedUrl.trim()}>
                {t("auth.reset.useLink")}
              </Button>
            </div>
          )}

          {token && <p className="text-xs text-success">{t("auth.reset.tokenReady")}</p>}

          <Input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("auth.reset.newPasswordPlaceholder")}
            type="password"
          />
          <Input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={t("auth.reset.confirmPlaceholder")}
            type="password"
          />
          <Button onClick={() => void handleSave()} disabled={busy || !password || !confirm} className="w-full">
            {busy ? t("auth.reset.saving") : t("auth.reset.save")}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void navigate("/login")} className="w-full">
            {t("auth.reset.backToLogin")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
