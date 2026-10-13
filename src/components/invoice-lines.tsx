import { formatMoney } from "@/lib/format";
import { invoiceTotal } from "@/lib/payments";

type Line = { id: string; description: string; quantity: number; unit_amount_cents: number };

export function InvoiceLines({ items, currency }: { items: Line[]; currency: string }) {
  return (
    <div className="rounded-card border border-line shadow-control">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-line text-ink-3">
            <th className="px-4 py-2.5 text-left font-medium">Description</th>
            <th className="px-4 py-2.5 text-right font-medium">Qty</th>
            <th className="px-4 py-2.5 text-right font-medium">Unit price</th>
            <th className="px-4 py-2.5 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-line">
              <td className="px-4 py-2.5">{item.description}</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{item.quantity}</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{formatMoney(item.unit_amount_cents, currency)}</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{formatMoney(item.quantity * item.unit_amount_cents, currency)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className="px-4 py-3 text-right font-medium">
              Total
            </td>
            <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatMoney(invoiceTotal(items), currency)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
