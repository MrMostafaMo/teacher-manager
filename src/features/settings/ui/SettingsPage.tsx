import { useTranslation } from "react-i18next";
import { NAV_ITEMS } from "@/app/navigation";
import { FeaturePlaceholder } from "@/shared/FeaturePlaceholder";

export default function SettingsPage() {
  const { t } = useTranslation();
  const item = NAV_ITEMS.find((n) => n.to === "/settings")!;
  return (
    <FeaturePlaceholder
      icon={item.icon}
      title={t(item.labelKey)}
      descriptionKey="features.settings.description"
      phase={item.phase}
    />
  );
}
