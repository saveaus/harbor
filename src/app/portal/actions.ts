"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { UploadedFile } from "@/components/upload-button";
import { text } from "@/lib/form-data";
import { personName } from "@/lib/format";
import { parseAnswers, parseFields } from "@/lib/forms";
import { startInvoiceCheckout } from "@/lib/checkout";
import { emailStaff } from "@/lib/notify";
import { getPortal, requirePortalApp } from "@/lib/portal";

function withError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function sendPortalMessage(form: FormData) {
  const body = text(form, "body");
  if (!body) return;
  const { supabase, workspace, contact, channels } = await getPortal();
  if (!channels.messages) throw new Error("No conversation is set up for you yet");
  const { error } = await supabase.rpc("portal_send_message", { target_channel: channels.messages, message_body: body });
  if (error) throw error;
  emailStaff(workspace.id, {
    topic: "messages",
    title: `New message from ${personName(contact)}`,
    body: body.length > 280 ? `${body.slice(0, 277)}...` : body,
    href: `/messages/${channels.messages}`,
  });
  revalidatePath("/portal/messages");
}

async function filesChannel() {
  const portal = await requirePortalApp("files");
  if (!portal.channels.files) throw new Error("No file space is set up for you yet");
  return { ...portal, channelId: portal.channels.files };
}

export async function recordPortalUpload(parentId: string | null, upload: UploadedFile) {
  const { supabase, channelId } = await filesChannel();
  const { error } = await supabase.rpc("portal_add_file", {
    target_channel: channelId,
    parent: parentId ?? undefined,
    item_kind: "file",
    item_name: upload.name,
    object_path: upload.storage_path,
    item_size: upload.size_bytes,
    item_type: upload.content_type,
  });
  if (error) throw error;
  revalidatePath("/portal/files", "layout");
}

export async function createPortalFolder(parentId: string | null, form: FormData) {
  const name = text(form, "name");
  if (!name) return;
  const { supabase, channelId } = await filesChannel();
  const { error } = await supabase.rpc("portal_add_file", {
    target_channel: channelId,
    parent: parentId ?? undefined,
    item_kind: "folder",
    item_name: name,
  });
  if (error) throw error;
  revalidatePath("/portal/files", "layout");
}

export async function portalDownloadUrl(storagePath: string): Promise<string> {
  const { supabase, workspace, channelId } = await filesChannel();
  if (!storagePath.startsWith(`${workspace.id}/${channelId}/`)) throw new Error("File is outside your space");
  const { data, error } = await supabase.storage.from("workspace-files").createSignedUrl(storagePath, 60);
  if (error) throw error;
  return data.signedUrl;
}

export async function signPortalContract(contractId: string, form: FormData) {
  const { supabase, workspace, contact } = await requirePortalApp("contracts");
  const path = `/portal/contracts/${contractId}`;
  if (form.get("agree") !== "on") withError(path, "Tick the box to confirm you agree.");
  const { error } = await supabase.rpc("portal_sign_contract", { target_contract: contractId, signer_name: text(form, "name") });
  if (error) withError(path, error.message);
  emailStaff(workspace.id, { topic: "documents", title: `${personName(contact)} signed a contract`, href: `/contracts/${contractId}` });
  revalidatePath("/portal", "layout");
  redirect(path);
}

export async function submitPortalForm(requestId: string, form: FormData) {
  const { supabase, workspace, contact } = await requirePortalApp("forms");
  const path = `/portal/forms/${requestId}`;
  const { data: request, error } = await supabase
    .from("form_requests")
    .select("id, form:forms(fields)").eq("workspace_id", workspace.id)
    .eq("id", requestId)
    .eq("status", "pending")
    .maybeSingle();
  if (error) throw error;
  if (!request?.form) withError("/portal/forms", "That form was already submitted or is no longer available.");

  let answers;
  try {
    answers = parseAnswers(parseFields(request.form.fields), form);
  } catch (invalid) {
    withError(path, invalid instanceof Error ? invalid.message : "Check your answers and try again.");
  }
  const submitted = await supabase.rpc("portal_submit_form", { target_request: requestId, submitted: answers });
  if (submitted.error) withError(path, submitted.error.message);
  emailStaff(workspace.id, { topic: "documents", title: `${personName(contact)} submitted a form`, href: "/forms" });
  revalidatePath("/portal", "layout");
  redirect("/portal/forms?submitted=1");
}

export async function payInvoice(invoiceId: string) {
  const { supabase, workspace, contact } = await requirePortalApp("payments");
  const path = `/portal/invoices/${invoiceId}`;
  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("id, number, currency, status, invoice_items(description, quantity, unit_amount_cents)").eq("workspace_id", workspace.id)
    .eq("id", invoiceId)
    .maybeSingle();
  if (error) throw error;
  if (!invoice) withError("/portal/invoices", "That invoice is no longer available.");
  if (invoice.status !== "open") withError(path, "This invoice isn't open for payment.");

  const checkout = await startInvoiceCheckout({
    workspaceId: workspace.id,
    invoiceId: invoice.id,
    number: invoice.number,
    currency: invoice.currency,
    customerEmail: contact.email,
    items: invoice.invoice_items,
    returnPath: path,
  });
  switch (checkout.kind) {
    case "redirect":
      redirect(checkout.url);
    case "unavailable":
      withError(path, checkout.reason);
    default: {
      const unhandled: never = checkout;
      throw new Error(`Unhandled checkout result ${JSON.stringify(unhandled)}`);
    }
  }
}
