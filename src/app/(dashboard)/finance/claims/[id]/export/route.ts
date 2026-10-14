import { csv, csvResponse } from "@/lib/csv";
import { prodaFilename, prodaRows } from "@/lib/finance";
import { refusal } from "@/lib/rpc";
import { getWorkspace } from "@/lib/workspace";
import { loadClaim } from "../claim-data";

/** POST because downloading marks the claim's lines as exported. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const [{ id }, ctx] = await Promise.all([params, getWorkspace()]);
  if (!ctx.installedApps.has("finance")) return new Response("Finance isn't installed", { status: 404 });
  if (ctx.member.role === "member") return new Response("Only workspace owners and admins can export claims.", { status: 403 });

  const loaded = await loadClaim(ctx, id);
  if (!loaded) return new Response("Claim not found", { status: 404 });
  if (loaded.problems.length || !loaded.provider) {
    const message = loaded.problems.join("\n");
    await ctx.supabase.from("claims").update({ export_error: message.slice(0, 2000) }).eq("workspace_id", ctx.workspace.id).eq("id", id);
    return new Response(message, { status: 422 });
  }
  await ctx.supabase.from("claims").update({ export_error: "" }).eq("workspace_id", ctx.workspace.id).eq("id", id);
  const body = csv(prodaRows(loaded.provider, loaded.claim.id, loaded.entries));

  const { error } = await ctx.supabase.rpc("mark_claim_exported", { target: id });
  const message = refusal(error);
  if (message) {
    await ctx.supabase.from("claims").update({ export_error: message.slice(0, 2000) }).eq("workspace_id", ctx.workspace.id).eq("id", id);
    return new Response(message, { status: 409 });
  }
  return csvResponse(body, prodaFilename(loaded.claim.number));
}
