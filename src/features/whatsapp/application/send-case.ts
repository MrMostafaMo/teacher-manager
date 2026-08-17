import { openExternal } from "@/features/whatsapp/infrastructure/opener";
import { buildWhatsAppLink } from "./wa-link";

/**
 * Send a message: build the wa.me deep link and open it in the system
 * browser. Throws when the phone has no digits.
 */
export async function sendWhatsAppMessage(phone: string, message: string): Promise<void> {
  const link = buildWhatsAppLink(phone, message);
  if (!link) throw new Error("whatsapp: phone has no digits");
  await openExternal(link);
}
