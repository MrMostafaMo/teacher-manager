import { useState } from "react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/shared/PageHeader";
import { Segmented } from "@/shared/Segmented";
import { SettingsAboutCard } from "./SettingsAboutCard";
import { SettingsAppearanceCard } from "./SettingsAppearanceCard";
import { SettingsDataCard } from "./SettingsDataCard";
import { SettingsNotificationsCard } from "./SettingsNotificationsCard";
import { SettingsSessionCard } from "./SettingsSessionCard";
import { SettingsShortcutsCard } from "./SettingsShortcutsCard";
import { SettingsTeacherCard } from "@/features/teacher-profile/ui/SettingsTeacherCard";
import { SettingsWhatsAppCard } from "@/features/whatsapp/ui/SettingsWhatsAppCard";
import { SyncSettingsCard } from "@/features/sync/ui/SyncSettingsCard";

type Tab = "appearance" | "preferences" | "data" | "about";

export default function SettingsPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("appearance");

  return (
    <div className="space-y-6">
      <PageHeader title={t("nav.settings")} description={t("settings.subtitle")} />

      <Segmented
        value={tab}
        onChange={setTab}
        ariaLabel={t("nav.settings")}
        className="w-full overflow-x-auto sm:w-fit"
        options={[
          { value: "appearance", label: t("settings.tabs.appearance") },
          { value: "preferences", label: t("settings.tabs.preferences") },
          { value: "data", label: t("settings.tabs.data") },
          { value: "about", label: t("settings.tabs.about") },
        ]}
      />

      {tab === "appearance" && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold">{t("settings.sections.identity")}</h3>
            <p className="text-xs text-muted-foreground">{t("settings.sections.identityHint")}</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
            <SettingsTeacherCard />
            <SettingsAppearanceCard />
          </div>
        </div>
      )}

      {tab === "preferences" && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold">{t("settings.sections.billing")}</h3>
            <p className="text-xs text-muted-foreground">{t("settings.sections.billingHint")}</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-5 lg:items-start">
            <div className="space-y-4 lg:col-span-3">
              <SettingsSessionCard />
              <SettingsNotificationsCard />
            </div>
            <div className="space-y-4 lg:col-span-2">
              <SettingsWhatsAppCard />
              <SettingsShortcutsCard />
            </div>
          </div>
        </div>
      )}

      {tab === "data" && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold">{t("settings.sections.sync")}</h3>
            <p className="text-xs text-muted-foreground">{t("settings.sections.syncHint")}</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-5 lg:items-start">
            <div className="lg:col-span-3">
              <SyncSettingsCard />
            </div>
            <div className="lg:col-span-2">
              <SettingsDataCard />
            </div>
          </div>
        </div>
      )}

      {tab === "about" && (
        <div className="mx-auto max-w-xl">
          <SettingsAboutCard />
        </div>
      )}
    </div>
  );
}
