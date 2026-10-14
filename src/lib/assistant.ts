import { tool, type UIMessage } from "ai";
import { z } from "zod";
import {
  CREDENTIALS,
  DOCUMENT_FOLDER,
  DOCUMENT_REVIEW,
  isClosedClient,
} from "@/lib/care";
import { personName, formatMoney } from "@/lib/format";
import { invoiceNumber, invoiceTotal } from "@/lib/payments";
import type { Enums } from "@/lib/supabase/database.types";
import type { WorkspaceContext } from "@/lib/workspace";

export const ASSISTANT_MODEL = "openai/gpt-5-mini";
export const MAX_ASSISTANT_INPUT = 2000;
const ROWS = 20;
const SCAN = 200;

const CREDENTIAL_KINDS = Object.keys(CREDENTIALS) as Enums<"credential_kind">[];

/** Longer, more specific phrases first so "driver's licence" does not become generic identification. */
const CREDENTIAL_SEARCH: { kind: Enums<"credential_kind">; needles: string[] }[] = [
  { kind: "ndis_worker_screening", needles: ["worker screening", "ndis screening"] },
  { kind: "working_with_children", needles: ["working with children", "wwcc"] },
  { kind: "employment_contract", needles: ["employment contract"] },
  { kind: "car_insurance", needles: ["car insurance", "vehicle insurance"] },
  { kind: "vehicle_registration", needles: ["vehicle registration", "rego"] },
  { kind: "police_check", needles: ["police check", "police clearance"] },
  { kind: "drivers_licence", needles: ["driver", "licence", "license"] },
  { kind: "first_aid", needles: ["first aid"] },
  { kind: "qualification", needles: ["qualification"] },
  { kind: "identification", needles: ["identification", "identity document", "photo id", "passport"] },
  { kind: "cpr", needles: ["cpr"] },
  { kind: "other", needles: ["other"] },
];

type Person = { first_name: string; last_name: string; email: string };

/** Strips PostgREST filter syntax so a search term can sit inside an `or=(...ilike...)` expression. */
function searchTerm(value: string): string {
  return value.replace(/[,()*%\\:."]/g, " ").trim().slice(0, 80);
}

function ilikeAny(columns: string[], terms: string[]): string {
  return terms.flatMap((term) => columns.map((column) => `${column}.ilike.%${term}%`)).join(",");
}

function matchCredential(query: string): { kind: Enums<"credential_kind">; label: string; terms: string[] } | null {
  const normalized = query.toLowerCase();
  const hit = CREDENTIAL_SEARCH.find(({ needles }) => needles.some((needle) => normalized.includes(needle)));
  if (!hit) return null;
  return { kind: hit.kind, label: CREDENTIALS[hit.kind], terms: hit.needles.map(searchTerm).filter(Boolean) };
}

function named(person: Person | null | undefined): { name: string; email: string } {
  if (!person) return { name: "Unknown", email: "" };
  return { name: personName(person), email: person.email };
}

export function assistantAvailable(workspace: WorkspaceContext["workspace"]): boolean {
  return workspace.assistant_enabled && Boolean(process.env.AI_GATEWAY_API_KEY);
}

export function messageText(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

export function assistantInstructions({ workspace, member }: WorkspaceContext): string {
  return [
    `You are the assistant inside Harbor, a client portal for the business "${workspace.name}".`,
    `You help ${member.display_name || member.email}, a staff member, with the same records they can already open: clients, staff, profile files, identity documents, credentials, invoices, contracts and conversations.`,
    `Today is ${new Date().toISOString().slice(0, 10)}. Amounts are in ${workspace.currency.toUpperCase()} unless a tool says otherwise.`,
    "Use the tools to look things up before answering questions about workspace data, and never invent clients, staff, files, amounts or dates.",
    "When asked who has or is missing a document, licence, ID or credential, call whoIsMissingDocument and lead with the missing names.",
    "If the tools return nothing relevant, say so plainly.",
    "You can draft messages or emails for the staff member to copy, but you cannot send anything or change data.",
    "Answer in short sentences, like a colleague. A one-line headline is fine, then the facts. The chat may add a short actionable list or buttons when someone can open a record or draft a message; still write the answer in text, and do not paste a second copy of that list. Do not use markdown headings or tables. Bold a word with **only** when it helps scan.",
    workspace.assistant_instructions ? `Instructions from the workspace admins:\n${workspace.assistant_instructions}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Read-only tools. Every query runs as the signed-in member, so row-level security bounds what the model can see. */
export function assistantTools({ supabase, workspace }: WorkspaceContext) {
  return {
    findClients: tool({
      description: "Search the workspace's clients by name, email or company. Leave query empty to list recent clients.",
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
          id: c.id,
          name: personName(c),
          email: c.email,
          company: c.company?.name ?? null,
          portalAccess: c.status,
          added: c.created_at.slice(0, 10),
        }));
      },
    }),

    findStaff: tool({
      description: "Search staff by name or email. Leave query empty to list recent staff.",
      inputSchema: z.object({ query: z.string().describe("Name or email to search for; empty for recent staff") }),
      execute: async ({ query }) => {
        const term = searchTerm(query);
        let request = supabase
          .from("staff")
          .select("id, first_name, last_name, email, status, position")
          .eq("workspace_id", workspace.id)
          .order("first_name")
          .limit(ROWS);
        if (term) request = request.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%`);
        const { data, error } = await request;
        if (error) throw error;
        return data.map((s) => ({ id: s.id, name: personName(s), email: s.email, status: s.status, role: s.position || null }));
      },
    }),

    listClientDocuments: tool({
      description:
        "List files attached on client profiles, including Documents and ID uploads. Filter by client name or by file title.",
      inputSchema: z.object({
        client: z.string().describe("Client name or email; empty for every client"),
        query: z.string().describe("File title or name to match, such as licence or passport; empty for recent files"),
      }),
      execute: async ({ client, query }) => {
        const clientTerm = searchTerm(client);
        const fileTerm = searchTerm(query);
        let contactIds: string[] | undefined;
        if (clientTerm) {
          const { data: contacts, error: contactError } = await supabase
            .from("contacts")
            .select("id")
            .eq("workspace_id", workspace.id)
            .or(`first_name.ilike.%${clientTerm}%,last_name.ilike.%${clientTerm}%,email.ilike.%${clientTerm}%`)
            .limit(ROWS);
          if (contactError) throw contactError;
          contactIds = contacts.map((c) => c.id);
          if (!contactIds.length) return [];
        }
        let request = supabase
          .from("client_documents")
          .select("contact_id, title, file_name, folder, created_at, contact:contacts(first_name, last_name, email)")
          .eq("workspace_id", workspace.id)
          .order("created_at", { ascending: false })
          .limit(ROWS);
        if (fileTerm) request = request.or(ilikeAny(["title", "file_name"], [fileTerm]));
        if (contactIds) request = request.in("contact_id", contactIds);
        const { data, error } = await request;
        if (error) throw error;
        return data.map((doc) => ({
          client: { ...named(doc.contact), id: doc.contact_id },
          title: doc.title,
          file: doc.file_name,
          folder: DOCUMENT_FOLDER[doc.folder].label,
          added: doc.created_at.slice(0, 10),
        }));
      },
    }),

    listStaffCredentials: tool({
      description: "List credentials and ID files on staff profiles, including driver's licences.",
      inputSchema: z.object({
        kind: z.enum(["any", ...CREDENTIAL_KINDS]).describe("Credential type, or any"),
        staff: z.string().describe("Staff name or email; empty for everyone"),
      }),
      execute: async ({ kind, staff }) => {
        const staffTerm = searchTerm(staff);
        let staffIds: string[] | undefined;
        if (staffTerm) {
          const { data: people, error: staffError } = await supabase
            .from("staff")
            .select("id")
            .eq("workspace_id", workspace.id)
            .or(`first_name.ilike.%${staffTerm}%,last_name.ilike.%${staffTerm}%,email.ilike.%${staffTerm}%`)
            .limit(ROWS);
          if (staffError) throw staffError;
          staffIds = people.map((s) => s.id);
          if (!staffIds.length) return [];
        }
        let request = supabase
          .from("staff_credentials")
          .select("staff_id, kind, file_name, reference, review, expires_on, staff:staff(first_name, last_name, email, status)")
          .eq("workspace_id", workspace.id)
          .order("created_at", { ascending: false })
          .limit(ROWS);
        if (kind !== "any") request = request.eq("kind", kind);
        if (staffIds) request = request.in("staff_id", staffIds);
        const { data, error } = await request;
        if (error) throw error;
        return data.map((row) => ({
          staff: { ...named(row.staff), id: row.staff_id },
          credential: CREDENTIALS[row.kind],
          file: row.file_name || null,
          reference: row.reference || null,
          review: DOCUMENT_REVIEW[row.review].label,
          expires: row.expires_on,
        }));
      },
    }),

    whoIsMissingDocument: tool({
      description:
        "Compare every client and/or staff profile against attached files to see who has or is missing a document, such as a driver's licence, passport or police check.",
      inputSchema: z.object({
        document: z.string().describe("Document to look for, for example driver's licence or identification"),
        people: z.enum(["clients", "staff", "both"]).describe("Whose profiles to check"),
        includeClosed: z.boolean().describe("Include inactive, archived or terminated people"),
      }),
      execute: async ({ document, people, includeClosed }) => {
        const term = searchTerm(document);
        if (!term) return { error: "Name the document to look for." };
        const matched = matchCredential(document);
        const fileTerms = matched?.terms.length ? matched.terms : [term];
        const label = matched?.label ?? document.trim();
        const checkClients = people === "clients" || people === "both";
        const checkStaff = people === "staff" || people === "both";

        const [clientsResult, clientDocsResult, staffResult, credentialsResult] = await Promise.all([
          checkClients
            ? supabase
                .from("contacts")
                .select("id, first_name, last_name, email, profile:client_profiles(status)")
                .eq("workspace_id", workspace.id)
                .order("first_name")
                .limit(SCAN)
            : Promise.resolve({ data: [], error: null }),
          checkClients
            ? supabase
                .from("client_documents")
                .select("contact_id, title, file_name, folder, contact:contacts(first_name, last_name, email)")
                .eq("workspace_id", workspace.id)
                .or(ilikeAny(["title", "file_name"], fileTerms))
                .limit(SCAN)
            : Promise.resolve({ data: [], error: null }),
          checkStaff
            ? supabase
                .from("staff")
                .select("id, first_name, last_name, email, status")
                .eq("workspace_id", workspace.id)
                .order("first_name")
                .limit(SCAN)
            : Promise.resolve({ data: [], error: null }),
          checkStaff
            ? (() => {
                let request = supabase
                  .from("staff_credentials")
                  .select("staff_id, kind, file_name, review, expires_on, staff:staff(first_name, last_name, email)")
                  .eq("workspace_id", workspace.id)
                  .limit(SCAN);
                if (matched) request = request.eq("kind", matched.kind);
                else request = request.or(ilikeAny(["file_name"], fileTerms));
                return request;
              })()
            : Promise.resolve({ data: [], error: null }),
        ]);
        for (const result of [clientsResult, clientDocsResult, staffResult, credentialsResult]) {
          if (result.error) throw result.error;
        }

        const clients = (clientsResult.data ?? []).filter((c) => includeClosed || !c.profile || !isClosedClient(c.profile.status));
        const clientAttachedIds = new Set((clientDocsResult.data ?? []).map((doc) => doc.contact_id));
        const staff = (staffResult.data ?? []).filter((s) => includeClosed || s.status !== "inactive");
        const staffDocs = (credentialsResult.data ?? []).filter((row) =>
          matched ? row.kind === matched.kind : fileTerms.some((t) => `${row.file_name} ${CREDENTIALS[row.kind]}`.toLowerCase().includes(t)),
        );
        const staffAttachedIds = new Set(staffDocs.map((row) => row.staff_id));

        const clientReport = {
          checked: clients.length,
          attached: (clientDocsResult.data ?? []).map((doc) => ({
            ...named(doc.contact),
            id: doc.contact_id,
            title: doc.title,
            file: doc.file_name,
            folder: DOCUMENT_FOLDER[doc.folder].label,
          })),
          missing: clients.filter((c) => !clientAttachedIds.has(c.id)).map((c) => ({ ...named(c), id: c.id })),
        };
        const staffReport = {
          checked: staff.length,
          attached: staffDocs.map((row) => ({
            ...named(row.staff),
            id: row.staff_id,
            credential: CREDENTIALS[row.kind],
            file: row.file_name || null,
            review: DOCUMENT_REVIEW[row.review].label,
            expires: row.expires_on,
          })),
          missing: staff.filter((s) => !staffAttachedIds.has(s.id)).map((s) => ({ ...named(s), id: s.id })),
        };

        return {
          document: label,
          truncated: clients.length === SCAN || staff.length === SCAN,
          ...(checkClients ? { clients: clientReport } : {}),
          ...(checkStaff ? { staff: staffReport } : {}),
        };
      },
    }),

    listInvoices: tool({
      description: "List invoices, newest first, optionally filtered by status.",
      inputSchema: z.object({ status: z.enum(["any", "open", "paid", "void", "draft"]).describe("Use any for all invoices") }),
      execute: async ({ status }) => {
        let request = supabase
          .from("invoices")
          .select(
            "id, number, status, currency, due_date, created_at, paid_at, contact:contacts(first_name, last_name, email), company:companies(name), invoice_items(quantity, unit_amount_cents)",
          )
          .eq("workspace_id", workspace.id)
          .order("created_at", { ascending: false })
          .limit(ROWS);
        if (status !== "any") request = request.eq("status", status);
        const { data, error } = await request;
        if (error) throw error;
        return data.map((i) => ({
          id: i.id,
          number: invoiceNumber(i.number),
          billedTo: i.company?.name ?? (i.contact ? personName(i.contact) : "Unknown"),
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
          .select("id, name, status, sent_at, signed_at, contact:contacts(first_name, last_name, email)")
          .eq("workspace_id", workspace.id)
          .order("sent_at", { ascending: false })
          .limit(ROWS);
        if (status !== "any") request = request.eq("status", status);
        const { data, error } = await request;
        if (error) throw error;
        return data.map((c) => ({
          id: c.id,
          name: c.name,
          client: c.contact ? personName(c.contact) : "Unknown",
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
