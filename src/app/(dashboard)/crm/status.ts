import type { Enums } from "@/lib/supabase/database.types";

export const crmTabs = [
  { href: "/crm/companies", label: "Companies" },
  { href: "/crm", label: "Contacts" },
];

export const contactStatus: Record<
  Enums<"contact_status">,
  { label: string; tone: "neutral" | "warning" | "success" }
> = {
  not_invited: { label: "Inactive", tone: "warning" },
  invited: { label: "Invited", tone: "warning" },
  active: { label: "Active", tone: "success" },
};

export type SortDirection = "asc" | "desc";

/** Reads `?sort=&dir=` against the columns a list allows, falling back to its default. */
export function parseSort<K extends string>(
  params: { sort?: string; dir?: string },
  allowed: readonly K[],
  fallback: { key: K; dir: SortDirection },
): { key: K; dir: SortDirection } {
  const key = allowed.find((k) => k === params.sort);
  if (!key) return fallback;
  return { key, dir: params.dir === "asc" ? "asc" : "desc" };
}

/** Builds a header link that sorts by `key`, flipping direction when it is already active. */
export function sortHref(base: string, q: string, active: { key: string; dir: SortDirection }, key: string): string {
  const dir = active.key === key && active.dir === "desc" ? "asc" : "desc";
  const params = new URLSearchParams({ sort: key, dir });
  if (q) params.set("q", q);
  return `${base}?${params}`;
}

/** PostgREST `or()` filters are comma/paren delimited, so search text drops those characters. */
export function searchPattern(q: string | undefined): string | null {
  const cleaned = (q ?? "").replace(/[,()*%\\]/g, " ").trim().slice(0, 100);
  return cleaned ? `%${cleaned}%` : null;
}
