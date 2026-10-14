import { BookOpen, ClipboardList, CreditCard, FileSignature, FolderClosed, Home, MessageSquare, type LucideIcon } from "lucide-react";
import { APP_KEYS, type AppKey } from "@/lib/apps";

export type PortalLink = { href: string; label: string; icon: LucideIcon; description: string };

/** Apps clients use in the portal. Time tracker is internal to the team. */
const PORTAL_APPS: Partial<Record<AppKey, PortalLink>> = {
  files: { href: "/portal/files", label: "Files", icon: FolderClosed, description: "Documents you share" },
  payments: { href: "/portal/invoices", label: "Invoices", icon: CreditCard, description: "Bills and payments" },
  contracts: { href: "/portal/contracts", label: "Contracts", icon: FileSignature, description: "Agreements to review and sign" },
  forms: { href: "/portal/forms", label: "Forms", icon: ClipboardList, description: "Questionnaires to fill out" },
  helpdesk: { href: "/portal/help", label: "Help", icon: BookOpen, description: "Answers to common questions" },
};

export const PORTAL_HOME: PortalLink = { href: "/portal", label: "Home", icon: Home, description: "" };
const MESSAGES: PortalLink = { href: "/portal/messages", label: "Messages", icon: MessageSquare, description: "Chat with our staff" };

/** Apps a client sees, in sidebar order. Messages and Files also need the client's own channel. */
export function portalApps(
  installedApps: ReadonlySet<AppKey>,
  channels: { messages: boolean; files: boolean },
): PortalLink[] {
  return [
    ...(channels.messages ? [MESSAGES] : []),
    ...APP_KEYS.filter((key) => installedApps.has(key) && (key !== "files" || channels.files)).flatMap((key) => PORTAL_APPS[key] ?? []),
  ];
}
