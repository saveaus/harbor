"use client";

import { Archive, Pencil, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { ActionCell, Button, Card, Cell, Field, Input, Row, Select, Table } from "@/components/ui";
import { GST, NDIS_CATEGORIES, UNITS, plainDollars, supportCategory, type BillingUnit, type GstCode } from "@/lib/finance";
import { formatMoney } from "@/lib/format";
import { savePriceItem, setPriceItemArchived } from "./actions";

export type PriceItem = {
  id: string;
  support_number: string;
  name: string;
  unit: BillingUnit;
  rate_cents: number | null;
  gst_code: GstCode;
};

function ItemFields({ item }: { item: PriceItem }) {
  return (
    <>
      <Field label="Name">
        <Input name="name" required maxLength={160} defaultValue={item.name} placeholder="Assistance with self-care – weekday daytime" />
      </Field>
      <Field label="NDIS support item number" hint="Leave empty for private services">
        <Input name="support_number" maxLength={50} defaultValue={item.support_number} placeholder="01_011_0107_1_1" />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Rate">
          <Input name="rate" type="number" min={0} step="0.01" required defaultValue={item.rate_cents === null ? "" : plainDollars(item.rate_cents)} />
        </Field>
        <Field label="Unit">
          <Select name="unit" defaultValue={item.unit}>
            {Object.entries(UNITS).map(([value, u]) => (
              <option key={value} value={value}>
                {u.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="GST">
          <Select name="gst" defaultValue={item.gst_code}>
            {Object.entries(GST).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </>
  );
}

function groupLabel(supportNumber: string): string {
  const prefix = supportCategory(supportNumber);
  return prefix ? `${prefix} · ${NDIS_CATEGORIES[prefix]}` : "Other";
}

export function PriceBookList({
  items,
  archived,
  admin,
  currency,
}: {
  items: PriceItem[];
  archived: boolean;
  admin: boolean;
  currency: string;
}) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<PriceItem | null>(null);
  const needle = query.trim().toLowerCase();
  const matched = useMemo(
    () =>
      needle
        ? items.filter((item) => item.name.toLowerCase().includes(needle) || item.support_number.toLowerCase().includes(needle))
        : items,
    [items, needle],
  );
  const groups = useMemo(() => {
    const byLabel = new Map<string, PriceItem[]>();
    for (const item of matched) {
      const label = groupLabel(item.support_number);
      const list = byLabel.get(label) ?? [];
      list.push(item);
      byLabel.set(label, list);
    }
    return [...byLabel.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [matched]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 px-9">
        <Field label="Search">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name or support number" className="w-72" />
        </Field>
        <p className="pb-2 text-[13px] text-ink-3">
          {needle ? `${matched.length} of ${items.length} items` : `${items.length} items`}
        </p>
      </div>
      {editing ? (
        <Card className="mx-9 space-y-4 p-5">
          <div>
            <h2 className="text-[13px] font-medium">Edit support item</h2>
            <p className="mt-0.5 text-[13px] text-ink-3">New rates apply to shifts saved or completed from now on. Charges already invoiced or claimed don&apos;t change.</p>
          </div>
          <form
            action={async (form) => {
              await savePriceItem(editing.id, form);
              setEditing(null);
            }}
            className="space-y-4"
          >
            <ItemFields item={editing} />
            <div className="flex gap-2">
              <Button type="submit" variant="primary">
                Save
              </Button>
              <Button type="button" onClick={() => setEditing(null)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      ) : null}
      {matched.length === 0 ? (
        <p className="px-9 text-[13px] text-ink-3">No items match “{query.trim()}”.</p>
      ) : (
        <Table columns={["Item", "Support item number", "Rate", "GST", ""]}>
          {groups.flatMap(([label, rows]) => [
            <tr key={label}>
              <td colSpan={5} className="bg-surface px-5 py-2 text-[12px] font-medium text-ink-3">
                {label}
              </td>
            </tr>,
            ...rows.map((item) => (
              <Row key={item.id}>
                <Cell className="font-medium">{item.name}</Cell>
                <Cell className="text-ink-3 tabular-nums">{item.support_number || "—"}</Cell>
                <Cell className="tabular-nums">
                  {formatMoney(item.rate_cents ?? 0, currency)} <span className="text-ink-3">{UNITS[item.unit].label.toLowerCase()}</span>
                </Cell>
                <Cell>{GST[item.gst_code]}</Cell>
                <ActionCell>
                  {admin ? (
                    <div className="flex justify-end gap-1">
                      {archived ? null : (
                        <Button type="button" variant="ghost" aria-label="Edit item" onClick={() => setEditing(item)}>
                          <Pencil size={14} />
                        </Button>
                      )}
                      <form action={setPriceItemArchived.bind(null, item.id, !archived)}>
                        <Button type="submit" variant="ghost" aria-label={archived ? "Restore item" : "Archive item"}>
                          {archived ? <RotateCcw size={14} /> : <Archive size={14} />}
                        </Button>
                      </form>
                    </div>
                  ) : null}
                </ActionCell>
              </Row>
            )),
          ])}
        </Table>
      )}
    </div>
  );
}
