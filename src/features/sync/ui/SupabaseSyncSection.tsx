import { useTranslation } from "react-i18next";
import { Database, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToastStore } from "@/lib/toast-store";
import { supabaseSignOut } from "../application/supabase-auth";
import { refreshSyncUi } from "./sync-events";
import { useSyncStore } from "./sync-store";
import { SupabaseLoginForm } from "./SupabaseLoginForm";
import { SupabaseChangePasswordForm } from "./SupabaseChangePasswordForm";

export function SupabaseSyncSection() {
  const { t } = useTranslation();
  const toast = useToastStore((s) => s.push);
  const supabaseEmail = useSyncStore((s) => s.supabaseEmail);

  async function handleDisconnect() {
    if (!window.confirm(t("common.confirmMessage"))) return;
    await supabaseSignOut();
    await refreshSyncUi();
    toast({ message: t("sync.settings.disconnected"), variant: "info" });
  }

  if (supabaseEmail) {
    return (
      <div className="space-y-3 rounded-xl border bg-card/70 p-4 shadow-sm ring-1 ring-foreground/5 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="flex size-8 items-center justify-center rounded-lg bg-success/10 text-success ring-1 ring-success/20">
            <Database className="size-4" />
          </span>
          {t("auth.login.supabaseTitle")}
          <span className="ms-auto rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-medium text-success">
            {t("sync.settings.connected")}
          </span>
        </div>
        <p className="text-sm font-medium" dir="ltr">
          {supabaseEmail}
        </p>
        <SupabaseChangePasswordForm />
        <Button variant="ghost" size="sm" onClick={() => void handleDisconnect()}>
          <LogOut className="size-4" /> {t("sync.settings.disconnect")}
        </Button>
      </div>
    );
  }

  return <SupabaseLoginForm />;
}
