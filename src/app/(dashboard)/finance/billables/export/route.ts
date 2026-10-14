import { csv, csvResponse } from "@/lib/csv";
import { BILLABLE_KIND, BILLABLE_STATUS, formatQuantity, plainDollars } from "@/lib/finance";
import { personName } from "@/lib/format";
import { enumValue } from "@/lib/care";
import { isDay } from "@/lib/roster";
import { getWorkspace } from "@/lib/workspace";

export async function POST(request: Request) {
  const ctx = await getWorkspace();
  if (!ctx.installedApps.has("finance")) return new Response("Finance isn't installed", { status: 404 });
  if (ctx.member.role === "member") return new Response("Only workspace owners and admins can export billables.", { status: 403 });

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const client = url.searchParams.get("client") ?? "";
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  const filter = status ? enumValue(BILLABLE_STATUS, status) : null;

  let query = ctx.supabase
    .from("billables")
    .select("service_date, kind, description, support_number, quantity, unit, amount_cents, status, contact:contacts(first_name, last_name, email)")
    .eq("workspace_id", ctx.workspace.id)
    .order("service_date", { ascending: false })
    .limit(2000);
  query = filter ? query.eq("status", filter) : query.neq("status", "void");
  if (client) query = query.eq("contact_id", client);
  if (from && isDay(from)) query = query.gte("service_date", from);
  if (to && isDay(to)) query = query.lte("service_date", to);
  const { data, error } = await query;
  if (error) throw error;

  const rows = [
    ["Date", "Client", "Type", "Description", "Support number", "Quantity", "Amount", "Status"],
    ...data.map((b) => [
      b.service_date,
      b.contact ? personName(b.contact) : "",
      BILLABLE_KIND[b.kind],
      b.description,
      b.support_number,
      formatQuantity(Number(b.quantity), b.unit),
      plainDollars(b.amount_cents ?? 0),
      BILLABLE_STATUS[b.status].label,
    ]),
  ];
  return csvResponse(csv(rows), "billables.csv");
}
