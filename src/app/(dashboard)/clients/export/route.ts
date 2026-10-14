import { CLIENT_STATUS, FUNDING, PLAN_MANAGEMENT } from "@/lib/care";
import { getWorkspace } from "@/lib/workspace";

/** Quotes a CSV field and neutralises leading characters spreadsheets treat as formulas. */
function csvField(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}

function csv(rows: string[][]): string {
  return rows.map((row) => row.map(csvField).join(",")).join("\r\n") + "\r\n";
}

export async function GET() {
  const { supabase, workspace } = await getWorkspace();
  const { data, error } = await supabase
    .from("contacts")
    .select(
      "first_name, last_name, email, created_at, profile:client_profiles(status, funding, ndis_number, plan_management, plan_start, plan_end)",
    )
    .eq("workspace_id", workspace.id)
    .order("created_at");
  if (error) throw error;
  const rows = [
    [
      "First name",
      "Last name",
      "Email",
      "Client status",
      "Funding",
      "NDIS number",
      "Plan management",
      "Plan start",
      "Plan end",
      "Created",
    ],
    ...data.map((c) => [
      c.first_name,
      c.last_name,
      c.email,
      c.profile ? CLIENT_STATUS[c.profile.status].label : "",
      c.profile?.funding ? FUNDING[c.profile.funding].label : "",
      c.profile?.ndis_number ?? "",
      c.profile?.plan_management ? PLAN_MANAGEMENT[c.profile.plan_management] : "",
      c.profile?.plan_start ?? "",
      c.profile?.plan_end ?? "",
      c.created_at,
    ]),
  ];

  return new Response(csv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="clients.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
