import { csv, csvResponse } from "@/lib/csv";
import { reportKey } from "@/lib/compliance";
import { reportTable } from "@/lib/compliance-data";
import { getWorkspace } from "@/lib/workspace";

export async function GET(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (!reportKey(key)) return new Response("Unknown report", { status: 404 });
  const ctx = await getWorkspace();
  if (!ctx.installedApps.has("compliance")) return new Response("Compliance isn't installed", { status: 404 });
  const search = new URL(request.url).searchParams;
  const filters = {
    status: search.get("status") ?? "",
    priority: search.get("priority") ?? "",
    severity: search.get("severity") ?? "",
    category: search.get("category") ?? "",
    from: search.get("from") ?? "",
    to: search.get("to") ?? "",
    q: search.get("q") ?? "",
    window: search.get("window") ?? "",
  };
  const table = await reportTable(ctx, key, filters);
  if (!table) return new Response("Unknown report", { status: 404 });
  return csvResponse(csv([table.columns, ...table.rows]), `${key}.csv`);
}
