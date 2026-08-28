import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";

export function SkipLocalButton() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  function handleSkip() {
    localStorage.setItem("tm-auth-skipped", "1");
    void navigate("/");
  }

  return (
    <div className="text-center">
      <Button variant="ghost" onClick={handleSkip} className="w-full">
        {t("auth.login.skip")}
      </Button>
      <p className="mt-2 text-xs text-muted-foreground">{t("auth.login.skipHint")}</p>
    </div>
  );
}
