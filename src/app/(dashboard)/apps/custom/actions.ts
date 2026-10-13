"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { STARTER_CODE, methodPermission, parseBridgeMethod, parsePermissions } from "@/lib/custom-apps";
import { contactName } from "@/lib/format";
import { text } from "@/lib/form-data";
import type { Json } from "@/lib/supabase/database.types";
import { getWorkspace } from "@/lib/workspace";

export type BridgeReply = { result: Json } | { error: string };

const MAX_VALUE_BYTES = 64 * 1024;

export async function createCustomApp(form: FormData) {
  const { supabase, workspace } = await getWorkspace();
  const { data, error } = await supabase
    .from("custom_apps")
    .insert({
      workspace_id: workspace.id,
      name: text(form, "name"),
      description: text(form, "description"),
      code: STARTER_CODE,
      permissions: ["clients:read", "storage"],
    })
    .select("id")
    .single();
  if (error) throw error;
  revalidatePath("/", "layout");
  redirect(`/apps/custom/${data.id}/edit`);
}

export async function updateCustomApp(id: string, form: FormData) {
  const { supabase, workspace } = await getWorkspace();
  const { error } = await supabase
    .from("custom_apps")
    .update({
      name: text(form, "name"),
      description: text(form, "description"),
      code: typeof form.get("code") === "string" ? (form.get("code") as string) : "",
      permissions: parsePermissions(form.getAll("permissions")),
      updated_at: new Date().toISOString(),
    })
    .eq("workspace_id", workspace.id)
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/", "layout");
  redirect(`/apps/custom/${id}`);
}

export async function deleteCustomApp(id: string) {
  const { supabase, workspace } = await getWorkspace();
  const { error } = await supabase.from("custom_apps").delete().eq("workspace_id", workspace.id).eq("id", id);
  if (error) throw error;
  revalidatePath("/", "layout");
  redirect("/apps/custom");
}

function readKey(params: unknown): string | undefined {
  if (typeof params !== "object" || params === null || !("key" in params)) return undefined;
  const { key } = params;
  return typeof key === "string" && key.length >= 1 && key.length <= 100 ? key : undefined;
}

/** The only door from a sandboxed app to workspace data. Every call is checked against the app's saved permissions. */
export async function callCustomApp(appId: string, rawMethod: unknown, params: unknown): Promise<BridgeReply> {
  const method = parseBridgeMethod(rawMethod);
  if (!method) return { error: "Unknown method" };
  const { supabase, workspace } = await getWorkspace();
  const { data: app, error } = await supabase
    .from("custom_apps")
    .select("id, permissions")
    .eq("workspace_id", workspace.id)
    .eq("id", appId)
    .maybeSingle();
  if (error) throw error;
  if (!app) return { error: "App not found" };
  if (!app.permissions.includes(methodPermission[method])) return { error: `This app doesn't have the "${methodPermission[method]}" permission` };

  const data = supabase.from("custom_app_data");
  switch (method) {
    case "clients.list": {
      const [companies, contacts] = await Promise.all([
        supabase.from("companies").select("id, name").eq("workspace_id", workspace.id).order("name").limit(1000),
        supabase.from("contacts").select("id, first_name, last_name, email, company_id").eq("workspace_id", workspace.id).order("first_name").limit(1000),
      ]);
      if (companies.error) throw companies.error;
      if (contacts.error) throw contacts.error;
      return {
        result: {
          companies: companies.data,
          contacts: contacts.data.map((c) => ({ id: c.id, name: contactName(c), email: c.email, companyId: c.company_id })),
        },
      };
    }
    case "storage.list": {
      const rows = await data.select("key").eq("app_id", app.id).order("key");
      if (rows.error) throw rows.error;
      return { result: rows.data.map((r) => r.key) };
    }
    case "storage.get": {
      const key = readKey(params);
      if (!key) return { error: "Keys are 1 to 100 characters" };
      const row = await data.select("value").eq("app_id", app.id).eq("key", key).maybeSingle();
      if (row.error) throw row.error;
      return { result: row.data?.value ?? null };
    }
    case "storage.set": {
      const key = readKey(params);
      if (!key) return { error: "Keys are 1 to 100 characters" };
      let json: string;
      try {
        json = JSON.stringify((params as { value?: unknown }).value ?? null);
      } catch {
        return { error: "Values must be JSON" };
      }
      if (new TextEncoder().encode(json).length > MAX_VALUE_BYTES) return { error: "Values can be up to 64 KB" };
      const saved = await data.upsert({
        app_id: app.id,
        workspace_id: workspace.id,
        key,
        value: JSON.parse(json) as Json,
        updated_at: new Date().toISOString(),
      });
      if (saved.error) throw saved.error;
      return { result: null };
    }
    case "storage.delete": {
      const key = readKey(params);
      if (!key) return { error: "Keys are 1 to 100 characters" };
      const removed = await data.delete().eq("app_id", app.id).eq("key", key);
      if (removed.error) throw removed.error;
      return { result: null };
    }
    default: {
      const unhandled: never = method;
      return { error: `Unhandled method ${String(unhandled)}` };
    }
  }
}
