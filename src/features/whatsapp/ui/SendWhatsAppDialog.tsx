import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { MessageCircle, MessageSquarePlus, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/shared/Field";
import { Modal } from "@/shared/Modal";
import { EmptyState } from "@/shared/EmptyState";
import { useToastStore } from "@/lib/toast-store";
import type { StudentProfileData } from "@/features/student-profile/application/student-profile-cases";
import type { WhatsAppTemplate } from "../domain";
import { VariableChips } from "./VariableChips";
import { TemplateSelect } from "./TemplateSelect";
import { PhonePicker, type PhoneSource } from "./PhonePicker";
import { buildTemplateVars } from "../application/template-vars";
import { renderTemplate } from "../application/template-render";
import { listTemplates } from "../application/whatsapp-cases";
import { sendWhatsAppMessage } from "../application/send-case";

interface Props {
  open: boolean;
  data: StudentProfileData;
  onClose: () => void;
}

export function SendWhatsAppDialog({ open, data, onClose }: Props) {
  const { t } = useTranslation();
  const toast = useToastStore((s) => s.push);
  const [templates, setTemplates] = useState<WhatsAppTemplate[] | null>(null);
  const [templateId, setTemplateId] = useState("");
  const [source, setSource] = useState<PhoneSource>("student");
  const [customPhone, setCustomPhone] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const selected = useMemo(
    () => templates?.find((row) => row.id === templateId) ?? templates?.[0],
    [templates, templateId],
  );

  useEffect(() => {
    if (!open) return;
    setSource(data.student.phone ? "student" : data.student.guardianPhone ? "guardian" : "custom");
    setCustomPhone("");
    void listTemplates(t).then((rows) => {
      setTemplates(rows);
      if (!rows.find((row) => row.id === templateId)) setTemplateId(rows[0]?.id ?? "");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- templateId read only to preserve selection, effect should not re-run on it
  }, [open, data, t]);

  useEffect(() => {
    setText(selected?.text ?? "");
  }, [selected]);

  const studentPhone = data.student.phone ?? "";
  const guardianPhone = data.student.guardianPhone ?? "";
  const phone =
    source === "custom" ? customPhone : source === "student" ? studentPhone : guardianPhone;
  const canSend = selected !== undefined && phone.trim() !== "" && text.trim() !== "";

  const preview = useMemo(() => renderTemplate(text, buildTemplateVars(data)), [text, data]);

  function insertVar(variable: string) {
    setText((s) => `${s}{${variable}}`);
  }

  async function handleSend() {
    if (!canSend || busy) return;
    setBusy(true);
    try {
      await sendWhatsAppMessage(phone, preview);
      toast({ message: t("whatsapp.sent"), variant: "success" });
      onClose();
    } catch {
      toast({ message: t("whatsapp.error"), variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} title={t("whatsapp.title")} onClose={onClose}>
      <div className="space-y-4">
        {templates === null ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : selected === undefined ? (
          <EmptyState
            icon={MessageSquarePlus}
            title={t("whatsapp.settings.noTemplates")}
            description={t("whatsapp.settings.noTemplatesHint")}
          />
        ) : (
          <>
            <Field label={t("whatsapp.template")} id="wa-template">
              <TemplateSelect templates={templates} value={selected.id} onChange={setTemplateId} />
            </Field>

            <PhonePicker
              source={source}
              customPhone={customPhone}
              studentPhone={studentPhone}
              guardianPhone={guardianPhone}
              onSourceChange={setSource}
              onCustomPhoneChange={setCustomPhone}
            />

            <Field label={t("whatsapp.message")} id="wa-message">
              <Textarea
                id="wa-message"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
                maxLength={500}
              />
            </Field>

            <Field label={t("whatsapp.variables")} id="wa-vars">
              <VariableChips onInsert={insertVar} />
            </Field>

            <Field label={t("whatsapp.preview")} id="wa-preview">
              <p
                id="wa-preview"
                className="max-h-40 overflow-y-auto rounded-lg border bg-muted/40 p-3 text-sm whitespace-pre-wrap"
                dir="auto"
              >
                {preview}
              </p>
            </Field>

            <Button
              className="w-full"
              onClick={() => void handleSend()}
              disabled={!canSend || busy}
            >
              {busy ? (
                <Send className="size-4 animate-pulse" />
              ) : (
                <MessageCircle className="size-4" />
              )}
              {busy ? t("whatsapp.sending") : t("whatsapp.send")}
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
}
