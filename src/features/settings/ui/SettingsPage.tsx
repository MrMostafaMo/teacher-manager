import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import { Database, Info, Palette, SlidersHorizontal } from "lucide-react";
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

function SectionIntro({
  icon: Icon,
  title,
  hint,
}: {
  icon: typeof Palette;
  title: string;
  hint: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/10">
        <Icon className="size-4 text-primary" />
      </span>
      <div>
        <h3 className="font-heading text-sm font-semibold leading-none">{title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}

type Tab = "appearance" | "preferences" | "data" | "about";

const VALID_TABS: Tab[] = ["appearance", "preferences", "data", "about"];

export default function SettingsPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab") as Tab | null;
  const tab: Tab = rawTab && VALID_TABS.includes(rawTab) ? rawTab : "appearance";
  const setTab = (v: Tab) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (v === "appearance") next.delete("tab");
      else next.set("tab", v);
      return next;
    }, { replace: true });
  };

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
        <div className="space-y-5">
          <SectionIntro
            icon={Palette}
            title={t("settings.sections.identity")}
            hint={t("settings.sections.identityHint")}
          />
          <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
            <SettingsTeacherCard />
            <SettingsAppearanceCard />
          </div>
        </div>
      )}

      {tab === "preferences" && (
        <div className="space-y-5">
          <SectionIntro
            icon={SlidersHorizontal}
            title={t("settings.sections.billing")}
            hint={t("settings.sections.billingHint")}
          />
          <div className="grid gap-5 lg:grid-cols-5 lg:items-start">
            <div className="space-y-5 lg:col-span-3">
              <SettingsSessionCard />
              <SettingsNotificationsCard />
            </div>
            <div className="space-y-5 lg:col-span-2">
              <SettingsWhatsAppCard />
              <SettingsShortcutsCard />
            </div>
          </div>
        </div>
      )}

      {tab === "data" && (
        <div className="space-y-5">
          <SectionIntro
            icon={Database}
            title={t("settings.sections.sync")}
            hint={t("settings.sections.syncHint")}
          />
          <div className="grid gap-5 lg:grid-cols-5 lg:items-start">
            <div className="lg:col-span-3">
              <SyncSettingsCard />
            </div>
            <div className="space-y-5 lg:col-span-2">
              <SettingsDataCard />
            </div>
          </div>
        </div>
      )}

      {tab === "about" && (
        <div className="mx-auto max-w-xl space-y-5">
          <SectionIntro icon={Info} title={t("settings.about")} hint={t("settings.aboutTagline")} />
          <SettingsAboutCard />
        </div>
      )}
    </div>
  );
}
