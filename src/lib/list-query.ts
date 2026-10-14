/**
 * A record table's view state (filters, sorts and hidden columns) and its query-string form.
 * Shared by list pages, which evaluate it, and the client controls, which edit it.
 */

export type SortDirection = "asc" | "desc";

export type AttributeType = "text" | "select" | "date";

export type AttributeOption = { value: string; label: string };

/** What the filter and sort controls need to know about one attribute. */
export type AttributeMeta = {
  key: string;
  label: string;
  type: AttributeType;
  options?: AttributeOption[];
  /** Attributes a row can hold several values of, such as lists. */
  multiple?: boolean;
  sortable?: boolean;
};

/** An attribute with how to read it from a row, for evaluating filters and sorts on the server. */
export type Attribute<Row> = AttributeMeta & { get: (row: Row) => string | string[] | null };

export const OPERATORS = {
  text: { contains: "contains", not_contains: "does not contain", is: "is", empty: "is empty", not_empty: "is not empty" },
  select: { any: "is any of", none: "is none of", empty: "is empty", not_empty: "is not empty" },
  date: {
    on: "is",
    before: "is before",
    after: "is after",
    within: "is within the next",
    empty: "is empty",
    not_empty: "is not empty",
  },
} as const satisfies Record<AttributeType, Record<string, string>>;

export type Operator = { [T in AttributeType]: keyof (typeof OPERATORS)[T] }[AttributeType];

export const VALUELESS: readonly Operator[] = ["empty", "not_empty"];

export type Filter = { attr: string; op: Operator; values: string[] };
export type Sort = { attr: string; dir: SortDirection };
export type ListState = { filters: Filter[]; match: "all" | "any"; sorts: Sort[]; hidden: string[] };

export type ListDefaults = { sorts: Sort[]; hidden: string[] };

type Params = Record<string, string | string[] | undefined>;

const list = (value: string | string[] | undefined): string[] => (value === undefined ? [] : Array.isArray(value) ? value : [value]);

const MAX_FILTERS = 12;
const MAX_SORTS = 4;

function operatorFor(type: AttributeType, op: string): Operator | null {
  return Object.hasOwn(OPERATORS[type], op) ? (op as Operator) : null;
}

/** Reads one `attr:op:value` filter, dropping anything the attribute can't hold. */
function parseFilter(raw: string, attrs: readonly AttributeMeta[]): Filter | null {
  const [key, rawOp, ...rest] = raw.split(":");
  const attr = attrs.find((a) => a.key === key);
  if (!attr || rawOp === undefined) return null;
  const op = operatorFor(attr.type, rawOp);
  if (!op) return null;
  if (VALUELESS.includes(op)) return { attr: attr.key, op, values: [] };
  const value = rest.join(":");
  if (attr.type === "text") return value.trim() ? { attr: attr.key, op, values: [value.slice(0, 100)] } : null;
  if (attr.type === "date") {
    const valid = op === "within" ? /^\d{1,4}$/.test(value) : /^\d{4}-\d{2}-\d{2}$/.test(value);
    return valid ? { attr: attr.key, op, values: [value] } : null;
  }
  const values = value.split("|").filter((v) => attr.options?.some((o) => o.value === v));
  return values.length ? { attr: attr.key, op, values } : null;
}

export function parseListState(params: Params, attrs: readonly AttributeMeta[], defaults: ListDefaults): ListState {
  const filters = list(params.f)
    .slice(0, MAX_FILTERS)
    .flatMap((raw) => parseFilter(raw, attrs) ?? []);
  const sorts = list(params.s)
    .flatMap((raw): Sort[] => {
      const [key, dir] = raw.split(":");
      const attr = attrs.find((a) => a.key === key && a.sortable !== false);
      return attr ? [{ attr: attr.key, dir: dir === "asc" ? "asc" : "desc" }] : [];
    })
    .filter((sort, index, all) => all.findIndex((s) => s.attr === sort.attr) === index)
    .slice(0, MAX_SORTS);
  const hidden =
    params.hide === undefined ? defaults.hidden : list(params.hide)[0].split(",").filter((key) => attrs.some((a) => a.key === key));
  return {
    filters,
    match: params.match === "any" ? "any" : "all",
    sorts: params.s === undefined ? defaults.sorts : sorts,
    hidden,
  };
}

const sameList = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((v, i) => v === b[i]);

function encodeState(state: ListState, defaults: ListDefaults): [string, string][] {
  const pairs: [string, string][] = state.filters.map((f) => ["f", [f.attr, f.op, ...(f.values.length ? [f.values.join("|")] : [])].join(":")]);
  if (state.match === "any" && state.filters.length > 1) pairs.push(["match", "any"]);
  const sorts = state.sorts.map((s) => `${s.attr}:${s.dir}`);
  if (!sameList(sorts, defaults.sorts.map((s) => `${s.attr}:${s.dir}`))) {
    if (sorts.length) for (const sort of sorts) pairs.push(["s", sort]);
    else pairs.push(["s", ""]);
  }
  if (!sameList([...state.hidden].sort(), [...defaults.hidden].sort())) pairs.push(["hide", state.hidden.join(",")]);
  return pairs;
}

/** The view state as a query string, leaving out whatever matches the list's defaults. */
export function stateQuery(state: ListState, defaults: ListDefaults): string {
  return new URLSearchParams(encodeState(state, defaults)).toString();
}

export function sameState(a: ListState, b: ListState, defaults: ListDefaults): boolean {
  return stateQuery(a, defaults) === stateQuery(b, defaults);
}

/** A list URL: the base view, the search text and the view state. */
export function listUrl(base: string, { view, q, state, defaults }: { view?: string; q?: string; state: ListState; defaults: ListDefaults }) {
  const query = new URLSearchParams();
  if (view) query.set("view", view);
  if (q) query.set("q", q);
  for (const [key, value] of encodeState(state, defaults)) query.append(key, value);
  const search = query.toString();
  return search ? `${base}?${search}` : base;
}

export function emptyState(defaults: ListDefaults): ListState {
  return { filters: [], match: "all", sorts: defaults.sorts, hidden: defaults.hidden };
}

function addDays(days: number): string {
  const day = new Date();
  day.setUTCDate(day.getUTCDate() + days);
  return day.toISOString().slice(0, 10);
}

function matches<Row>(row: Row, attr: Attribute<Row>, filter: Filter): boolean {
  const raw = attr.get(row);
  const values = (Array.isArray(raw) ? raw : raw === null ? [] : [raw]).filter((v) => v !== "");
  const [target = ""] = filter.values;
  switch (filter.op) {
    case "empty":
      return values.length === 0;
    case "not_empty":
      return values.length > 0;
    case "contains":
      return values.some((v) => v.toLowerCase().includes(target.toLowerCase()));
    case "not_contains":
      return !values.some((v) => v.toLowerCase().includes(target.toLowerCase()));
    case "is":
      return values.some((v) => v.toLowerCase() === target.toLowerCase());
    case "any":
      return values.some((v) => filter.values.includes(v));
    case "none":
      return !values.some((v) => filter.values.includes(v));
    case "on":
      return values.some((v) => v.slice(0, 10) === target);
    case "before":
      return values.some((v) => v.slice(0, 10) < target);
    case "after":
      return values.some((v) => v.slice(0, 10) > target);
    case "within": {
      const today = addDays(0);
      const until = addDays(Number(target));
      return values.some((v) => v.slice(0, 10) >= today && v.slice(0, 10) <= until);
    }
    default: {
      const unreachable: never = filter.op;
      throw new Error(`Unknown operator ${String(unreachable)}`);
    }
  }
}

function sortKey<Row>(row: Row, attr: Attribute<Row>): string | number | null {
  const raw = attr.get(row);
  const value = Array.isArray(raw) ? (raw[0] ?? null) : raw;
  if (value === null || value === "") return null;
  if (attr.type === "select" && attr.options) {
    const index = attr.options.findIndex((o) => o.value === value);
    return index === -1 ? attr.options.length : index;
  }
  return attr.type === "text" ? value.toLowerCase() : value;
}

/** Rows matching the filters, in sort order. Empty values sort last in either direction. */
export function applyState<Row>(rows: readonly Row[], attrs: readonly Attribute<Row>[], state: Pick<ListState, "filters" | "match" | "sorts">): Row[] {
  const byKey = new Map(attrs.map((a) => [a.key, a]));
  const checks = state.filters.flatMap((f) => {
    const attr = byKey.get(f.attr);
    return attr ? [(row: Row) => matches(row, attr, f)] : [];
  });
  const kept = checks.length ? rows.filter((row) => (state.match === "any" ? checks.some((c) => c(row)) : checks.every((c) => c(row)))) : [...rows];
  const sorts = state.sorts.flatMap((s) => {
    const attr = byKey.get(s.attr);
    return attr ? [{ attr, sign: s.dir === "asc" ? 1 : -1 }] : [];
  });
  return kept.sort((a, b) => {
    for (const { attr, sign } of sorts) {
      const [x, y] = [sortKey(a, attr), sortKey(b, attr)];
      if (x === y) continue;
      if (x === null) return 1;
      if (y === null) return -1;
      return x < y ? -sign : sign;
    }
    return 0;
  });
}

/** Strips the server-only readers so attribute definitions can cross into client components. */
export function attributeMeta<Row>(attrs: readonly Attribute<Row>[]): AttributeMeta[] {
  return attrs.map(({ get: _get, ...meta }) => meta);
}

/** A URL that carries only the parameters that are set. */
export function listHref(base: string, params: Record<string, string | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
  const search = query.toString();
  return search ? `${base}?${search}` : base;
}
