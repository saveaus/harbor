import {
  listUrl,
  parseListState,
  sameState,
  type AttributeMeta,
  type Filter,
  type ListDefaults,
  type ListState,
} from "@/lib/list-query";
import { viewParams, type SavedView } from "@/lib/saved-views";

/** A built-in view: a named set of filters over the default sorts and columns. */
export type Preset = { key: string; label: string; filters: Filter[]; match?: "all" | "any" };

type Params = Record<string, string | string[] | undefined>;

export type ResolvedView = {
  base: string;
  q: string;
  defaults: ListDefaults;
  /** The selected view's key: a preset key, or a saved view's id. */
  view: string;
  savedViewId: string | null;
  viewState: ListState;
  state: ListState;
  dirty: boolean;
  views: { key: string; label: string; href: string; state: ListState }[];
};

export function resolveView({
  base,
  params,
  attrs,
  defaults,
  presets,
  saved,
}: {
  base: string;
  params: Params;
  attrs: readonly AttributeMeta[];
  defaults: ListDefaults;
  presets: readonly Preset[];
  saved: readonly SavedView[];
}): ResolvedView {
  const q = (typeof params.q === "string" ? params.q : "").trim().slice(0, 100);
  const [first] = presets;
  const views = [
    ...presets.map((p) => ({
      key: p.key,
      label: p.label,
      state: { filters: p.filters, match: p.match ?? "all", sorts: defaults.sorts, hidden: defaults.hidden } satisfies ListState,
    })),
    ...saved.map((v) => ({ key: v.id, label: v.name, state: parseListState(viewParams(v.query), attrs, defaults) })),
  ].map((v) => ({ ...v, href: listUrl(base, { view: v.key === first.key ? undefined : v.key, q, state: v.state, defaults }) }));
  const selected = views.find((v) => v.key === params.view) ?? views[0];
  const state = parseListState(params, attrs, defaults);
  return {
    base,
    q,
    defaults,
    view: selected.key,
    savedViewId: saved.some((v) => v.id === selected.key) ? selected.key : null,
    viewState: selected.state,
    state,
    dirty: !sameState(state, selected.state, defaults),
    views,
  };
}

/** The URL for the current view with a changed state. */
export function viewUrl(resolved: ResolvedView, state: ListState): string {
  const { base, view, q, defaults, views } = resolved;
  return listUrl(base, { view: view === views[0].key ? undefined : view, q, state, defaults });
}

/** Header menu links for one column: sort it either way, filter by it, or hide it. */
export function columnMenu(resolved: ResolvedView, attr: AttributeMeta, hideable = true) {
  const { state } = resolved;
  const sortable = attr.sortable !== false;
  return {
    ascHref: sortable ? viewUrl(resolved, { ...state, sorts: [{ attr: attr.key, dir: "asc" }] }) : undefined,
    descHref: sortable ? viewUrl(resolved, { ...state, sorts: [{ attr: attr.key, dir: "desc" }] }) : undefined,
    hideHref: hideable ? viewUrl(resolved, { ...state, hidden: [...state.hidden, attr.key] }) : undefined,
    filterAttr: attr.key,
  };
}

export function sortedBy(state: ListState, key: string): "asc" | "desc" | undefined {
  return state.sorts[0]?.attr === key ? state.sorts[0].dir : undefined;
}
