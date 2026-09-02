import { useState } from "react";
import { useTranslation } from "react-i18next";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isValidHex, useThemeStore } from "@/lib/theme/theme-store";

export function CustomColorPicker() {
  const { t } = useTranslation();
  const customPrimary = useThemeStore((s) => s.customPrimary);
  const setCustomPrimary = useThemeStore((s) => s.setCustomPrimary);
  const [draft, setDraft] = useState(customPrimary ?? "");
  const [error, setError] = useState<string | null>(null);

  const apply = () => {
    const v = draft.trim();
    if (!v) {
      setCustomPrimary(null);
      setError(null);
      return;
    }
    const normalized = v.startsWith("#") ? v : `#${v}`;
    if (!isValidHex(normalized)) {
      setError(t("settings.customColorInvalid"));
      return;
    }
    setError(null);
    setCustomPrimary(normalized.toLowerCase());
    setDraft(normalized.toLowerCase());
  };

  const reset = () => {
    setDraft("");
    setError(null);
    setCustomPrimary(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative">
          <input
            type="color"
            value={isValidHex(draft) ? draft : customPrimary ?? "#4f46e5"}
            onChange={(e) => {
              setDraft(e.target.value);
              setError(null);
            }}
            className="h-9 w-9 cursor-pointer rounded-md border border-input p-1"
            aria-label={t("settings.customColor")}
          />
        </div>
        <Input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (error) setError(null);
          }}
          placeholder={t("settings.customColorPlaceholder")}
          className="h-9 max-w-[140px] font-mono text-xs"
          dir="ltr"
        />
        <Button size="sm" onClick={apply} className="h-9">
          {t("common.save")}
        </Button>
        {(customPrimary || draft) && (
          <Button size="sm" variant="ghost" onClick={reset} className="h-9" aria-label={t("settings.customColorReset")}>
            <RotateCcw className="size-3.5" />
          </Button>
        )}
      </div>
      {customPrimary && (
        <p className="text-xs text-muted-foreground">
          {t("settings.customColor")}:{" "}
          <span className="inline-flex items-center gap-1">
            <span
              className="inline-block size-3 rounded-full border ring-1 ring-foreground/10"
              style={{ background: customPrimary }}
            />
            <span dir="ltr" className="font-mono">
              {customPrimary}
            </span>
          </span>
        </p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">{t("settings.customColorHint")}</p>
    </div>
  );
}
