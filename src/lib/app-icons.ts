import { BookOpen, ClipboardList, Clock, CreditCard, FileSignature, FileText, type LucideIcon } from "lucide-react";
import type { AppKey } from "@/lib/apps";

export const APP_ICONS: Record<AppKey, LucideIcon> = {
  files: FileText,
  payments: CreditCard,
  contracts: FileSignature,
  forms: ClipboardList,
  helpdesk: BookOpen,
  timetracker: Clock,
};
