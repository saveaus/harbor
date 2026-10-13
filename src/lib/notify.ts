import { after } from "next/server";
import { sendEmail } from "@/lib/email";
import { appUrl } from "@/lib/stripe";
import { getAdminClient, type AdminSupabase } from "@/lib/supabase/admin";
import type { WorkspaceContext } from "@/lib/workspace";

export type TeamTopic = "messages" | "payments" | "documents";
export type TeamNotification = { topic: TeamTopic; title: string; body?: string; href: string };

export type ContactTopic = "messages" | "invoices" | "contracts" | "forms";
export type ContactNotification = { topic: ContactTopic; subject: string; body?: string; path: string };
export type Recipient = { contact_id: string | null; company_id: string | null };

const TEAM_PREFERENCE = { messages: "email_messages", payments: "email_payments", documents: "email_documents" } as const;
const CONTACT_SETTING = {
  messages: "contact_email_messages",
  invoices: "contact_email_invoices",
  contracts: "contact_email_contracts",
  forms: "contact_email_forms",
} as const;

function notificationRow(workspaceId: string, { title, body, href }: TeamNotification) {
  return { workspace_id: workspaceId, title, body, href };
}

/** Records an in-app notification as the signed-in member, then emails the team. */
export async function notify(ctx: WorkspaceContext, notification: TeamNotification) {
  const { error } = await ctx.supabase.from("notifications").insert(notificationRow(ctx.workspace.id, notification));
  if (error) throw error;
  emailTeam(ctx.workspace.id, notification);
}

/** Records a notification for events with no signed-in member, such as webhooks and client actions. */
export async function notifyAsSystem(admin: AdminSupabase, workspaceId: string, notification: TeamNotification) {
  const { error } = await admin.from("notifications").insert(notificationRow(workspaceId, notification));
  if (error) throw error;
  emailTeam(workspaceId, notification);
}

/** Emails team members who opted into this topic; for events whose in-app notification is recorded elsewhere. */
export function emailTeam(workspaceId: string, notification: TeamNotification) {
  after(() => sendTeamEmails(workspaceId, notification));
}

/** Emails the contact, or every invited contact of the company, when the workspace allows that topic. */
export function emailClients(workspaceId: string, recipient: Recipient, notification: ContactNotification) {
  after(() => sendClientEmails(workspaceId, recipient, notification));
}

async function loadBrand(admin: AdminSupabase, workspaceId: string) {
  const { data, error } = await admin.from("workspaces").select("*").eq("id", workspaceId).single();
  if (error) throw error;
  return data;
}

async function sendTeamEmails(workspaceId: string, notification: TeamNotification) {
  const admin = getAdminClient();
  if (!admin) return;
  const workspace = await loadBrand(admin, workspaceId);
  const { data: members, error } = await admin
    .from("workspace_members")
    .select("email")
    .eq("workspace_id", workspaceId)
    .eq(TEAM_PREFERENCE[notification.topic], true);
  if (error) throw error;
  await Promise.all(
    members.map((member) =>
      sendEmail({
        to: member.email,
        subject: notification.title,
        heading: notification.title,
        body: notification.body,
        action: { label: "Open in Harbor", href: `${appUrl()}${notification.href}` },
        brand: { name: workspace.name, color: workspace.brand_color },
      }),
    ),
  );
}

async function sendClientEmails(workspaceId: string, recipient: Recipient, notification: ContactNotification) {
  const admin = getAdminClient();
  if (!admin) return;
  const workspace = await loadBrand(admin, workspaceId);
  if (!workspace[CONTACT_SETTING[notification.topic]]) return;

  let query = admin.from("contacts").select("email").eq("workspace_id", workspaceId).neq("status", "not_invited");
  if (recipient.contact_id) query = query.eq("id", recipient.contact_id);
  else if (recipient.company_id) query = query.eq("company_id", recipient.company_id);
  else return;
  const { data: contacts, error } = await query;
  if (error) throw error;

  const base = workspace.custom_domain ? `https://${workspace.custom_domain}` : appUrl();
  await Promise.all(
    contacts.map((contact) =>
      sendEmail({
        to: contact.email,
        subject: notification.subject,
        heading: notification.subject,
        body: notification.body,
        action: { label: "View in portal", href: `${base}${notification.path}` },
        brand: { name: workspace.name, color: workspace.brand_color },
      }),
    ),
  );
}
