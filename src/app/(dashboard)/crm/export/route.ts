import { getWorkspace } from "@/lib/workspace";
import { contactStatus } from "../status";

/** Quotes a CSV field and neutralises leading characters spreadsheets treat as formulas. */
function csvField(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}

function csv(rows: string[][]): string {
  return rows.map((row) => row.map(csvField).join(",")).join("\r\n") + "\r\n";
}

export async function GET(request: Request) {
  const type = new URL(request.url).searchParams.get("type");
  if (type !== "contacts" && type !== "companies") return new Response("Unknown export type", { status: 400 });
  const { supabase, workspace } = await getWorkspace();

  let rows: string[][];
  if (type === "contacts") {
    const { data, error } = await supabase
      .from("contacts")
      .select("first_name, last_name, email, status, created_at, company:companies(name)")
      .eq("workspace_id", workspace.id)
      .order("created_at");
    if (error) throw error;
    rows = [
      ["First name", "Last name", "Email", "Company", "Status", "Created"],
      ...data.map((c) => [c.first_name, c.last_name, c.email, c.company?.name ?? "", contactStatus[c.status].label, c.created_at]),
    ];
  } else {
    const { data, error } = await supabase
      .from("companies")
      .select("name, website, created_at")
      .eq("workspace_id", workspace.id)
      .order("created_at");
    if (error) throw error;
    rows = [["Name", "Website", "Created"], ...data.map((c) => [c.name, c.website ?? "", c.created_at])];
  }

  return new Response(csv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${type}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
