import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { configureSupabase } from "@/features/sync/application/supabase-auth";

export function SupabaseConfigRow() {
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
      <Button size="sm" variant="outline" onClick={() => void configureSupabase(url, key).then(() => setOpen(false))} disabled={!url.trim() || !key.trim()}>
        {t("common.save")}
      </Button>
    </div>
  );
}
