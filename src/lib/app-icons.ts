import { BookOpen, CalendarDays, ClipboardList, Clock, CreditCard, FileSignature, FileText, Landmark, ShieldCheck, type LucideIcon } from "lucide-react";
import type { AppKey } from "@/lib/apps";

export const APP_ICONS: Record<AppKey, LucideIcon> = {
  files: FileText,
  payments: CreditCard,
  contracts: FileSignature,
  forms: ClipboardList,
  helpdesk: BookOpen,
  timetracker: Clock,
  scheduling: CalendarDays,
  finance: Landmark,
  compliance: ShieldCheck,
};
