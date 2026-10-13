import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

const PAGE_SIZE = 100;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function problem(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: NextRequest) {
  const admin = getAdminClient();
  if (!admin) return problem(503, "The API isn't available on this deployment.");

  const header = request.headers.get("authorization") ?? "";
  const key = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!key.startsWith("hk_")) return problem(401, "Send an API key as: Authorization: Bearer hk_...");

  const { data: apiKey, error } = await admin
    .from("api_keys")
    .select("id, workspace_id")
    .eq("key_hash", createHash("sha256").update(key).digest("hex"))
    .is("revoked_at", null)
    .maybeSingle();
  if (error) throw error;
  if (!apiKey) return problem(401, "That API key is invalid or was revoked.");

  const after = request.nextUrl.searchParams.get("after");
  if (after !== null && !UUID.test(after)) return problem(400, "after must be a contact id.");

  let query = admin
    .from("contacts")
    .select("id, first_name, last_name, email, status, company_id, created_at")
    .eq("workspace_id", apiKey.workspace_id)
    .order("id")
    .limit(PAGE_SIZE);
  if (after) query = query.gt("id", after);
  const [{ data: contacts, error: listError }, touched] = await Promise.all([
    query,
    admin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", apiKey.id),
  ]);
  if (listError) throw listError;
  if (touched.error) throw touched.error;

  return NextResponse.json({
    data: contacts,
    next: contacts.length === PAGE_SIZE ? contacts[contacts.length - 1].id : null,
  });
}
