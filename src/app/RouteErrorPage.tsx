import { useTranslation } from "react-i18next";
import { isRouteErrorResponse, useRouteError } from "react-router";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RouteErrorPage() {
  const { t } = useTranslation();
  const error = useRouteError();
  if (isRouteErrorResponse(error)) console.error(error.status, error.statusText);
  else console.error(error);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <TriangleAlert className="size-10 text-destructive" />
      <h1 className="text-lg font-semibold">{t("error.title")}</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        {t("error.description")}
      </p>
      <Button onClick={() => window.location.reload()}>
        {t("common.retry")}
      </Button>
    </div>
  );
}
