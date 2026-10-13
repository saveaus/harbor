import { tool } from "ai";
import { z } from "zod";
import { contactName, formatMoney } from "@/lib/format";
import { invoiceNumber, invoiceTotal } from "@/lib/payments";
import type { WorkspaceContext } from "@/lib/workspace";

export const ASSISTANT_MODEL = "openai/gpt-5-mini";
export const MAX_ASSISTANT_INPUT = 2000;
const ROWS = 20;

/** Strips PostgREST filter syntax so a search term can sit inside an `or=(...ilike...)` expression. */
function searchTerm(value: string): string {
  return value.replace(/[,()*%\\:."]/g, " ").trim().slice(0, 80);
}

export function assistantAvailable(workspace: WorkspaceContext["workspace"]): boolean {
  return workspace.assistant_enabled && Boolean(process.env.AI_GATEWAY_API_KEY);
}

export function assistantInstructions({ workspace, member }: WorkspaceContext): string {
  return [
    `You are the assistant inside Harbor, a client portal for the business "${workspace.name}".`,
    `You help ${member.display_name || member.email}, a team member, with their clients, invoices, contracts and conversations.`,
    `Today is ${new Date().toISOString().slice(0, 10)}. Amounts are in ${workspace.currency.toUpperCase()} unless a tool says otherwise.`,
    "Use the tools to look things up before answering questions about workspace data, and never invent clients, amounts or dates.",
    "If the tools return nothing relevant, say so plainly.",
    "You can draft messages or emails for the team member to copy, but you cannot send anything or change data.",
    "Reply in plain text without markdown headings or tables. Keep answers short; use short lists when listing several items.",
    workspace.assistant_instructions ? `Instructions from the workspace admins:\n${workspace.assistant_instructions}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Read-only tools. Every query runs as the signed-in member, so row-level security bounds what the model can see. */
export function assistantTools({ supabase, workspace }: WorkspaceContext) {
  return {
    findClients: tool({
      description: "Search the workspace's clients (contacts) by name, email or company. Leave query empty to list recent clients.",
      inputSchema: z.object({ query: z.string().describe("Name, email or company to search for; empty for recent clients") }),
      execute: async ({ query }) => {
        const term = searchTerm(query);
        let request = supabase
          .from("contacts")
          .select("id, first_name, last_name, email, status, created_at, company:companies(name)")
          .eq("workspace_id", workspace.id)
          .order("created_at", { ascending: false })
          .limit(ROWS);
        if (term) request = request.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%`);
        const { data, error } = await request;
        if (error) throw error;
        return data.map((c) => ({
          name: contactName(c),
          email: c.email,
          company: c.company?.name ?? null,
          portalAccess: c.status,
          added: c.created_at.slice(0, 10),
        }));
      },
    }),

    listInvoices: tool({
      description: "List invoices, newest first, optionally filtered by status.",
      inputSchema: z.object({ status: z.enum(["any", "open", "paid", "void", "draft"]).describe("Use any for all invoices") }),
      execute: async ({ status }) => {
        let request = supabase
          .from("invoices")
          .select(
            "number, status, currency, due_date, created_at, paid_at, contact:contacts(first_name, last_name, email), company:companies(name), invoice_items(quantity, unit_amount_cents)",
          )
          .eq("workspace_id", workspace.id)
          .order("created_at", { ascending: false })
          .limit(ROWS);
        if (status !== "any") request = request.eq("status", status);
        const { data, error } = await request;
        if (error) throw error;
        return data.map((i) => ({
          number: invoiceNumber(i.number),
          billedTo: i.company?.name ?? (i.contact ? contactName(i.contact) : "Unknown"),
          status: i.status,
          total: formatMoney(invoiceTotal(i.invoice_items), i.currency),
          due: i.due_date,
          issued: i.created_at.slice(0, 10),
          paid: i.paid_at?.slice(0, 10) ?? null,
        }));
      },
    }),

    listContracts: tool({
      description: "List contracts sent to clients, newest first, with their signature status.",
      inputSchema: z.object({ status: z.enum(["any", "awaiting_signature", "signed", "declined"]) }),
      execute: async ({ status }) => {
        let request = supabase
          .from("contracts")
          .select("name, status, sent_at, signed_at, contact:contacts(first_name, last_name, email)")
          .eq("workspace_id", workspace.id)
          .order("sent_at", { ascending: false })
          .limit(ROWS);
        if (status !== "any") request = request.eq("status", status);
        const { data, error } = await request;
        if (error) throw error;
        return data.map((c) => ({
          name: c.name,
          client: c.contact ? contactName(c.contact) : "Unknown",
          status: c.status,
          sent: c.sent_at.slice(0, 10),
          signed: c.signed_at?.slice(0, 10) ?? null,
        }));
      },
    }),

    readConversation: tool({
      description: "Read the latest messages in the conversation with a client or company, matched by conversation title.",
      inputSchema: z.object({ client: z.string().describe("Client or company name") }),
      execute: async ({ client }) => {
        const term = searchTerm(client);
        if (!term) return { error: "Name a client or company." };
        const { data: channels, error } = await supabase
          .from("channels")
          .select("id, title")
          .eq("workspace_id", workspace.id)
          .eq("kind", "messages")
          .ilike("title", `%${term}%`)
          .limit(1);
        if (error) throw error;
        const channel = channels[0];
        if (!channel) return { error: `No conversation matches "${client}".` };
        const { data: messages, error: messageError } = await supabase
          .from("messages")
          .select("author_name, body, created_at")
          .eq("workspace_id", workspace.id)
          .eq("channel_id", channel.id)
          .order("created_at", { ascending: false })
          .limit(ROWS);
        if (messageError) throw messageError;
        return {
          conversation: channel.title,
          messages: messages.reverse().map((m) => ({ from: m.author_name, at: m.created_at.slice(0, 16), text: m.body.slice(0, 1000) })),
        };
      },
    }),
  };
}
