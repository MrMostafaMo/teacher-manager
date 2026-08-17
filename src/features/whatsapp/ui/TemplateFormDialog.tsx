import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/shared/Field";
import { Modal } from "@/shared/Modal";
import { useToastStore } from "@/lib/toast-store";
import {
  WHATSAPP_PURPOSES,
  WHATSAPP_MAX_LENGTH,
  WHATSAPP_MAX_NAME,
  type WhatsAppPurpose,
  type WhatsAppTemplate,
} from "../domain";
import { VariableChips } from "./VariableChips";
import { upsertTemplate } from "../application/whatsapp-cases";

interface Props {
  open: boolean;
  template: WhatsAppTemplate | null;
  onClose: () => void;
  onSaved: () => void;
}

export function TemplateFormDialog({ open, template, onClose, onSaved }: Props) {
  const { t } = useTranslation();
  const toast = useToastStore((s) => s.push);
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState<WhatsAppPurpose>("general");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(template?.name ?? "");
    setPurpose(template?.purpose ?? "general");
    setText(template?.text ?? "");
  }, [open, template]);

  const canSave = name.trim() !== "" && text.trim() !== "";

  async function handleSave() {
    if (!canSave || busy) return;
    setBusy(true);
    try {
      await upsertTemplate({ id: template?.id, name, purpose, text }, t);
      toast({ message: t("whatsapp.settings.saved"), variant: "success" });
      onSaved();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      title={template ? t("whatsapp.settings.edit") : t("whatsapp.settings.add")}
      onClose={onClose}
    >
      <div className="space-y-4">
        <Field label={t("whatsapp.settings.name")} id="wa-name">
          <Input
            id="wa-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={WHATSAPP_MAX_NAME}
          />
        </Field>

        <Field label={t("whatsapp.template")} id="wa-form-purpose">
          <Select
            id="wa-form-purpose"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value as WhatsAppPurpose)}
          >
            {WHATSAPP_PURPOSES.map((p) => (
              <option key={p} value={p}>
                {t(`whatsapp.purposes.${p}`)}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={t("whatsapp.message")} id="wa-form-text">
          <Textarea
            id="wa-form-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            maxLength={WHATSAPP_MAX_LENGTH}
          />
        </Field>

        <Field label={t("whatsapp.variables")} id="wa-form-vars">
          <VariableChips onInsert={(v) => setText((s) => `${s}{${v}}`)} />
        </Field>

        <Button className="w-full" onClick={() => void handleSave()} disabled={!canSave || busy}>
          <Save className="size-4" />
          {t("whatsapp.save")}
        </Button>
      </div>
    </Modal>
  );
}
