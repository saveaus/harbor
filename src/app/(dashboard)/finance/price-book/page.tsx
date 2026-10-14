import Link from "next/link";
import { BookOpen, Plus, Upload } from "lucide-react";
import type { ReactNode } from "react";
import { FormDialog } from "@/components/dialog";
import { Alert, Button, EmptyState, Field, Input, Select, textLinkClass } from "@/components/ui";
import { GST, UNITS, plainDollars, type BillingUnit, type GstCode } from "@/lib/finance";
import { formatDate } from "@/lib/format";
import { requireApp } from "@/lib/workspace";
import { importPriceGuide, savePriceItem } from "../actions";
import { PriceBookList } from "../price-book-list";

type ItemDefaults = { support_number: string; name: string; unit: BillingUnit; rate_cents: number | null; gst_code: GstCode };

function ItemFields({ item }: { item: ItemDefaults }) {
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

export default async function PriceBookPage({ searchParams }: { searchParams: Promise<{ archived?: string; error?: string; notice?: string }> }) {
  const [params, { supabase, workspace, member }] = await Promise.all([searchParams, requireApp("finance")]);
  const admin = member.role !== "member";
  const archived = params.archived === "1";
  const [items, settings] = await Promise.all([
    supabase
      .from("price_book_items")
      .select("id, support_number, name, unit, rate_cents, gst_code, archived")
      .eq("workspace_id", workspace.id)
      .eq("archived", archived)
      .order("name"),
    supabase.from("finance_settings").select("price_guide_imported_at").eq("workspace_id", workspace.id).maybeSingle(),
  ]);
  if (items.error) throw items.error;
  if (settings.error) throw settings.error;

  const addDialog: ReactNode = admin ? (
    <FormDialog
      trigger={
        <>
          <Plus size={14} /> Add item
        </>
      }
      title="Add support item"
      description="Shifts charge each client this rate for their share of the hours worked."
      action={savePriceItem.bind(null, null)}
      submitLabel="Add item"
    >
      <ItemFields item={{ support_number: "", name: "", unit: "hour", rate_cents: null, gst_code: "P2" }} />
    </FormDialog>
  ) : null;

  const importCsv = admin ? (
    <FormDialog
      triggerVariant="secondary"
      trigger={
        <>
          <Upload size={14} /> Import a CSV
        </>
      }
      title="Import NDIS price guide"
      description="Use the official NDIS support catalogue CSV. Re-importing updates rates. Shifts already priced keep theirs."
      action={importPriceGuide}
      submitLabel="Import file"
    >
      <Field label="NDIS support catalogue">
        <input type="file" name="catalogue" required accept=".csv,text/csv,text/plain" className="block w-full text-[13px] text-ink-3" />
      </Field>
    </FormDialog>
  ) : null;

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3 px-9 pt-5 pb-3">
        <div className="max-w-[560px]">
          <h1 className="text-[16px] font-medium">Price book</h1>
          <p className="mt-1 text-[13px] text-ink-3">
          Your rates for each support. Import the current NDIS catalogue to add support numbers, units and rates. Re-importing updates those rates; shifts already priced keep
          theirs.
          {settings.data?.price_guide_imported_at ? ` Last imported ${formatDate(settings.data.price_guide_imported_at)}.` : ""}{" "}
          <Link href={archived ? "/finance/price-book" : "/finance/price-book?archived=1"} className={textLinkClass}>
            {archived ? "Show active items" : "Show archived"}
          </Link>
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {admin ? (
            <form action={importPriceGuide}>
              <Button type="submit" variant="secondary">
                Import NDIS 2025–26 catalogue
              </Button>
            </form>
          ) : null}
          {importCsv}
          {addDialog}
        </div>
      </div>
      {params.notice ? (
        <div className="px-9 pb-3">
          <Alert tone="success">{params.notice}</Alert>
        </div>
      ) : null}
      {params.error ? (
        <div className="px-9 pb-3">
          <Alert>{params.error}</Alert>
        </div>
      ) : null}
      {items.data.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={18} />}
          title={archived ? "No archived items" : "Your price book is empty"}
          body="Add the supports you deliver with their rates, or import the current NDIS catalogue. Shifts use them to create charges for each client."
          action={archived ? undefined : (addDialog ?? undefined)}
        />
      ) : (
        <PriceBookList items={items.data} archived={archived} admin={admin} currency={workspace.currency} />
      )}
    </>
  );
}
