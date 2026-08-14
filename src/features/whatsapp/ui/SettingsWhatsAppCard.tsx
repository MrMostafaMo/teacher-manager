import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MessageCircle, MessageSquarePlus, Pencil, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/shared/EmptyState";
import { ConfirmDeleteButton } from "@/shared/ConfirmDeleteButton";
import { useConfirmDelete } from "@/shared/useConfirmDelete";
import { useToastStore } from "@/lib/toast-store";
import type { WhatsAppTemplate } from "../domain";
import { deleteTemplate, listTemplates, resetTemplateDefaults } from "../application/whatsapp-cases";
import { TemplateFormDialog } from "./TemplateFormDialog";

export function SettingsWhatsAppCard() {
  const { t } = useTranslation();
  const toast = useToastStore((s) => s.push);
  const { armed, request, clear } = useConfirmDelete();
  const [templates, setTemplates] = useState<WhatsAppTemplate[] | null>(null);
  const [editing, setEditing] = useState<WhatsAppTemplate | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    void listTemplates(t).then(setTemplates);
  }, [t]);

  async function handleDelete(id: string) {
    if (!request(id)) return;
    await deleteTemplate(id, t);
    setTemplates((rows) => (rows ?? []).filter((row) => row.id !== id));
    clear();
  }

  async function handleResetAll() {
    await resetTemplateDefaults(t);
    setTemplates(await listTemplates(t));
    toast({ message: t("whatsapp.settings.resetDone"), variant: "success" });
  }

  const rows = templates ?? [];

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <MessageCircle className="size-4" />
            {t("whatsapp.settings.title")}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setAdding(true)} disabled={!templates}>
              <Plus className="size-4" />
              {t("whatsapp.settings.add")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => void handleResetAll()} disabled={!templates}>
              <RotateCcw className="size-4" />
              {t("whatsapp.settings.reset")}
            </Button>
          </div>
        </div>

        <p className="mb-3 text-xs text-muted-foreground">{t("whatsapp.settings.hint")}</p>

        {templates === null ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={MessageSquarePlus}
            title={t("whatsapp.settings.noTemplates")}
            description={t("whatsapp.settings.noTemplatesHint")}
          />
        ) : (
          <ul className="divide-y">
            {rows.map((template) => (
              <li key={template.id} className="flex items-center gap-2 py-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{template.name}</span>
                    <Badge variant="secondary" className="shrink-0">
                      {t(`whatsapp.purposes.${template.purpose}`)}
                    </Badge>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{template.text}</p>
                </div>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={t("whatsapp.settings.edit")}
                  title={t("whatsapp.settings.edit")}
                  onClick={() => setEditing(template)}
                >
                  <Pencil />
                </Button>
                <ConfirmDeleteButton
                  armed={armed === template.id}
                  deleteLabel={t("whatsapp.settings.delete")}
                  confirmLabel={t("whatsapp.settings.delete")}
                  onDelete={() => void handleDelete(template.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <TemplateFormDialog
        open={adding || editing !== null}
        template={editing}
        onClose={() => {
          setAdding(false);
          setEditing(null);
        }}
        onSaved={() => {
          setAdding(false);
          setEditing(null);
          void listTemplates(t).then(setTemplates);
        }}
      />
    </Card>
  );
}