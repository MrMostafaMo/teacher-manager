import { CheckCircle2, Info, TriangleAlert, type LucideIcon } from "lucide-react";
import type { ToastVariant } from "@/lib/toast-store";

/** Icon per toast variant (single source for all toast presentation maps). */
export const ICONS: Record<ToastVariant, LucideIcon> = {
  success: CheckCircle2,
  error: TriangleAlert,
  info: Info,
};

/** Icon color per variant. */
export const ICON_TONES: Record<ToastVariant, string> = {
  success: "text-(--chart-2)",
  error: "text-destructive",
  info: "text-primary",
};

/** Tinted chip background per variant. */
export const CHIP_TONES: Record<ToastVariant, string> = {
  success: "bg-(--chart-tint-2)",
  error: "bg-destructive/10",
  info: "bg-(--chart-tint-1)",
};

/**
 * Shared Button variant for the toast action pill. Undo toasts use the brand
 * gradient CTA; the map exists so future action tones stay declarative.
 */
export const ACTION_VARIANTS: Record<ToastVariant, "default" | "outline"> = {
  success: "default",
  error: "default",
  info: "default",
};
