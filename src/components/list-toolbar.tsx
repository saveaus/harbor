import type { ChipTone } from "@/lib/care";
import { stateQuery, type AttributeMeta } from "@/lib/list-query";
import type { ResolvedView } from "@/lib/list-view";
import type { ViewObject } from "@/lib/saved-views";
import { deleteView, saveView } from "@/app/(dashboard)/view-actions";
import { ColumnsControl, FilterControl, ListStateBar, SortControl, StatusFilter } from "./list-controls";
import { ListSearch } from "./list-search";
import { ViewBar } from "./record-list";

/** A record table's views, search, filter, sort and column controls, and its active-state bar. */
export function ListToolbar({
  object,
  resolved,
  attrs,
  columns,
  counts,
  placeholder,
  status,
}: {
  object: ViewObject;
  resolved: ResolvedView;
  attrs: AttributeMeta[];
  columns: { key: string; label: string }[];
  counts: Map<string, number>;
  placeholder: string;
  /** When set, status is chosen here instead of as a view pill or a generic filter row. */
  status?: { tones: Record<string, ChipTone>; counts: Map<string, number> };
}) {
  const { base, q, state, defaults, view, views, viewState, dirty, savedViewId } = resolved;
  const target = { base, view: view === views[0].key ? undefined : view, q, defaults };
  const query = stateQuery(state, defaults);
  const keep = new URLSearchParams(query);
  if (target.view) keep.set("view", target.view);
  const active = views.find((v) => v.key === view);
  const statusAttr = status ? attrs.find((a) => a.key === "status") : undefined;
  const filterAttrs = statusAttr ? attrs.filter((a) => a.key !== "status") : attrs;
  return (
    <>
      <ViewBar
        active={active?.href ?? ""}
        views={views.map((v) => ({ href: v.href, label: v.key === view && dirty ? `${v.label} *` : v.label, count: counts.get(v.key) }))}
      >
        <ListSearch key={q} path={base} q={q} keep={keep.toString()} placeholder={placeholder} />
        {status && statusAttr ? (
          <StatusFilter {...target} attr={statusAttr} state={state} viewState={viewState} tones={status.tones} counts={status.counts} />
        ) : null}
        <FilterControl {...target} attrs={filterAttrs} state={state} />
        <SortControl {...target} attrs={attrs} state={state} />
        <ColumnsControl {...target} columns={columns} state={state} />
      </ViewBar>
      <ListStateBar
        {...target}
        attrs={attrs}
        state={state}
        viewState={viewState}
        dirty={dirty}
        saveView={saveView.bind(null, object, query)}
        deleteView={savedViewId ? deleteView.bind(null, object, savedViewId) : undefined}
      />
    </>
  );
}
