import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import type { LucideIcon } from "lucide-react";
import { Home } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface FeaturePlaceholderProps {
  icon: LucideIcon;
  title: string;
  descriptionKey: string;
  phase: number;
}

export function FeaturePlaceholder({
  icon: Icon,
  title,
  descriptionKey,
  phase,
}: FeaturePlaceholderProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed py-24 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
        <Icon className="size-6 text-muted-foreground" />
      </div>
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          {t(descriptionKey)}
        </p>
      </div>
      <Badge variant="secondary">
        {t("placeholder.phase", { phase })}
      </Badge>
      <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
        <Home className="size-4" />
        {t("placeholder.back")}
      </Button>
    </div>
  );
}
