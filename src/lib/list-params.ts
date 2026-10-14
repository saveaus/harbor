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

/** The sort a column header switches to: its key, flipping direction when it is already active. */
export function nextSort(active: { key: string; dir: SortDirection }, key: string): { sort: string; dir: SortDirection } {
  return {
    sort: key,
    dir: active.key === key && active.dir === "desc" ? "asc" : "desc",
  };
}

/** A list URL that carries only the parameters that are set. */
export function listHref(base: string, params: Record<string, string | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
  const search = query.toString();
  return search ? `${base}?${search}` : base;
}

/** PostgREST `or()` filters are comma/paren delimited, so search text drops those characters. */
export function searchPattern(q: string | undefined): string | null {
  const cleaned = (q ?? "")
    .replace(/[,()*%\\]/g, " ")
    .trim()
    .slice(0, 100);
  return cleaned ? `%${cleaned}%` : null;
}
