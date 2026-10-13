"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button, Field, Input, Select, Textarea, buttonClass } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import type { Recipient } from "@/lib/payments";
import { createInvoice, type InvoiceDraft } from "../../actions";

type Line = { key: number; description: string; quantity: string; price: string; productId: string | null };

const blankLine = (key: number): Line => ({ key, description: "", quantity: "1", price: "", productId: null });

function lineCents(line: Line): number {
  const quantity = Number.parseInt(line.quantity, 10);
  const price = Number.parseFloat(line.price);
  if (!Number.isFinite(quantity) || !Number.isFinite(price)) return 0;
  return quantity * Math.round(price * 100);
}

export function InvoiceEditor({
  recipients,
  products,
  businessName,
}: {
  recipients: Recipient[];
  products: { id: string; name: string; amount_cents: number }[];
  businessName: string;
}) {
  const [recipient, setRecipient] = useState(recipients[0]?.value ?? "");
  const [dueDate, setDueDate] = useState("");
  const [memo, setMemo] = useState("");
  const [collection, setCollection] = useState<InvoiceDraft["collection"]>("send_invoice");
  const [lines, setLines] = useState<Line[]>([blankLine(0)]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const total = lines.reduce((sum, line) => sum + lineCents(line), 0);
  const recipientLabel = recipients.find((r) => r.value === recipient)?.label ?? "—";

  const update = (key: number, patch: Partial<Line>) =>
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await createInvoice({
        recipient,
        dueDate,
        memo,
        collection,
        items: lines.map((line) => ({
          description: line.description,
          quantity: Number.parseInt(line.quantity, 10),
          unitAmountCents: Math.round(Number.parseFloat(line.price) * 100),
          productId: line.productId,
        })),
      });
      setError(result.error);
    });
  }

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[minmax(380px,1fr)_1fr]">
      <div className="space-y-5 overflow-y-auto border-r border-line px-6 py-6">
        <h1 className="text-[16px] font-semibold">New invoice</h1>
        {recipients.length === 0 ? (
          <p className="rounded-control bg-warning-soft px-3 py-2 text-[13px] text-warning">
            Add a company or contact before creating an invoice.
          </p>
        ) : null}
        <Field label="Bill to">
          <Select value={recipient} onChange={(e) => setRecipient(e.target.value)}>
            {recipients.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        </Field>

        <div>
          <div className="mb-1.5 text-[13px] font-medium">Line items</div>
          <div className="space-y-2">
            {lines.map((line) => (
              <div key={line.key} className="grid grid-cols-[1fr_64px_96px_28px] gap-2">
                <Input
                  placeholder="Description"
                  value={line.description}
                  list="invoice-products"
                  onChange={(e) => {
                    const product = products.find((p) => p.name === e.target.value);
                    update(line.key, {
                      description: e.target.value,
                      productId: product?.id ?? null,
                      ...(product ? { price: (product.amount_cents / 100).toFixed(2) } : {}),
                    });
                  }}
                />
                <Input
                  type="number"
                  min={1}
                  step={1}
                  aria-label="Quantity"
                  value={line.quantity}
                  onChange={(e) => update(line.key, { quantity: e.target.value })}
                />
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                  aria-label="Unit price"
                  value={line.price}
                  onChange={(e) => update(line.key, { price: e.target.value })}
                />
                <button
                  type="button"
                  aria-label="Remove line"
                  disabled={lines.length === 1}
                  onClick={() => setLines((current) => current.filter((l) => l.key !== line.key))}
                  className="flex items-center justify-center rounded-control text-ink-4 hover:bg-hover hover:text-danger disabled:opacity-30"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <datalist id="invoice-products">
            {products.map((p) => (
              <option key={p.id} value={p.name} />
            ))}
          </datalist>
          <button
            type="button"
            className={buttonClass("ghost", "mt-2 -ml-2")}
            onClick={() => setLines((current) => [...current, blankLine(Math.max(...current.map((l) => l.key)) + 1)])}
          >
            <Plus size={14} /> Add line
          </button>
        </div>

        <Field label="Due date">
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Field>

        <fieldset>
          <legend className="mb-1.5 text-[13px] font-medium">Collection</legend>
          {(
            [
              ["send_invoice", "Ask the client to pay", "They'll see the invoice in their portal."],
              ["charge_automatically", "Charge their saved payment method", "Requires a connected payment processor."],
            ] as const
          ).map(([value, label, hint]) => (
            <label key={value} className="flex items-start gap-2 py-1">
              <input
                type="radio"
                name="collection"
                checked={collection === value}
                onChange={() => setCollection(value)}
                className="mt-1 accent-[var(--color-accent)]"
              />
              <span>
                <span className="block text-[13px]">{label}</span>
                <span className="block text-[12px] text-ink-3">{hint}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <Field label="Memo">
          <Textarea rows={3} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="Thanks for your business." />
        </Field>

        {error ? <p className="rounded-control bg-danger-soft px-3 py-2 text-[13px] text-danger">{error}</p> : null}
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="primary" disabled={pending || !recipient} onClick={submit}>
            {pending ? "Creating…" : "Create invoice"}
          </Button>
        </div>
      </div>

      <div className="overflow-y-auto bg-subtle px-8 py-8">
        <div className="mx-auto max-w-md rounded-card border border-line bg-canvas p-6 shadow-control">
          <div className="flex justify-between">
            <div className="text-[16px] font-semibold">Invoice</div>
            <div className="text-right text-[12px] text-ink-3">{businessName}</div>
          </div>
          <dl className="mt-4 grid grid-cols-[90px_1fr] gap-y-1 text-[12px]">
            <dt className="text-ink-3">Billed to</dt>
            <dd>{recipientLabel}</dd>
            <dt className="text-ink-3">Due</dt>
            <dd>{dueDate || "On receipt"}</dd>
          </dl>
          <div className="mt-5 text-[22px] font-semibold tabular-nums">{formatMoney(total)}</div>
          <table className="mt-4 w-full text-[12px]">
            <thead>
              <tr className="border-b border-line text-ink-3">
                <th className="py-1.5 text-left font-medium">Description</th>
                <th className="py-1.5 text-right font-medium">Qty</th>
                <th className="py-1.5 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.key} className="border-b border-line">
                  <td className="py-1.5">{line.description || <span className="text-ink-4">Item</span>}</td>
                  <td className="py-1.5 text-right tabular-nums">{line.quantity || 0}</td>
                  <td className="py-1.5 text-right tabular-nums">{formatMoney(lineCents(line))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {memo ? <p className="mt-4 text-[12px] whitespace-pre-wrap text-ink-3">{memo}</p> : null}
        </div>
      </div>
    </div>
  );
}
