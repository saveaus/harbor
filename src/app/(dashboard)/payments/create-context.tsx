"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, use, useRef, type ReactNode, type RefObject } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { FormDialog } from "@/components/dialog";
import { Menu } from "@/components/menu";
import { Field, Input, Select, Textarea, buttonClass } from "@/components/ui";
import { formatMoney, intervalLabel } from "@/lib/format";
import type { Recipient } from "@/lib/payments";
import { createPaymentLink, createService, createSubscription } from "./actions";

type CreateKind = "service" | "subscription" | "link";
type Product = { id: string; name: string; amount_cents: number; currency: string; billing_interval: string };

const OpenCreate = createContext<(kind: CreateKind) => void>(() => {});

/** Owns the Payments create dialogs so the header and empty states open the same ones. */
export function PaymentsCreateProvider({
  products,
  recipients,
  currency,
  children,
}: {
  products: Product[];
  recipients: Recipient[];
  currency: string;
  children: ReactNode;
}) {
  const serviceRef = useRef<HTMLDialogElement>(null);
  const subscriptionRef = useRef<HTMLDialogElement>(null);
  const linkRef = useRef<HTMLDialogElement>(null);
  const refs: Record<CreateKind, RefObject<HTMLDialogElement | null>> = {
    service: serviceRef,
    subscription: subscriptionRef,
    link: linkRef,
  };
  const recurring = products.filter((p) => p.billing_interval !== "one_time");

  return (
    <OpenCreate value={(kind) => refs[kind].current?.showModal()}>
      {children}

      <FormDialog
        dialogRef={serviceRef}
        title="Create service"
        description="Services are reusable prices for invoices, subscriptions, payment links and your store."
        action={createService}
        submitLabel="Create service"
      >
        <Field label="Name">
          <Input name="name" required maxLength={120} placeholder="Monthly retainer" />
        </Field>
        <Field label="Description">
          <Textarea name="description" rows={2} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={`Price (${currency.toUpperCase()})`}>
            <Input name="amount" type="number" min={0} step="0.01" required placeholder="0.00" />
          </Field>
          <Field label="Billing">
            <Select name="billing_interval" defaultValue="one_time">
              <option value="one_time">One-time</option>
              <option value="month">Monthly</option>
              <option value="year">Yearly</option>
            </Select>
          </Field>
        </div>
      </FormDialog>

      <FormDialog
        dialogRef={subscriptionRef}
        title="Create subscription"
        description="Bill a client for a recurring service."
        action={createSubscription}
        submitLabel="Start subscription"
      >
        {recurring.length === 0 ? (
          <p className="text-[13px] text-ink-3">Create a monthly or yearly service first.</p>
        ) : (
          <>
            <Field label="Client">
              <Select name="recipient" required>
                {recipients.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Service">
              <Select name="product_id" required>
                {recurring.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {formatMoney(p.amount_cents, p.currency)} {intervalLabel(p.billing_interval).toLowerCase()}
                  </option>
                ))}
              </Select>
            </Field>
          </>
        )}
      </FormDialog>

      <FormDialog
        dialogRef={linkRef}
        title="Create payment link"
        description="Share a link anyone can use to buy a service."
        action={createPaymentLink}
        submitLabel="Create link"
      >
        {products.length === 0 ? (
          <p className="text-[13px] text-ink-3">Create a service first.</p>
        ) : (
          <>
            <Field label="Name">
              <Input name="name" required maxLength={120} placeholder="Strategy session" />
            </Field>
            <Field label="Service">
              <Select name="product_id" required>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {formatMoney(p.amount_cents, p.currency)}
                  </option>
                ))}
              </Select>
            </Field>
          </>
        )}
      </FormDialog>
    </OpenCreate>
  );
}

export function CreateButton({ kind, children }: { kind: CreateKind; children: ReactNode }) {
  const open = use(OpenCreate);
  return (
    <button type="button" className={buttonClass("primary")} onClick={() => open(kind)}>
      <Plus /> {children}
    </button>
  );
}

type PrimaryAction = { label: string; kind: CreateKind | "invoice" | "store" };

function primaryAction(pathname: string): PrimaryAction {
  if (pathname.startsWith("/payments/subscriptions")) return { label: "Create subscription", kind: "subscription" };
  if (pathname.startsWith("/payments/store")) return { label: "Store settings", kind: "store" };
  if (pathname.startsWith("/payments/links")) return { label: "Create payment link", kind: "link" };
  if (pathname.startsWith("/payments/services")) return { label: "Create service", kind: "service" };
  return { label: "Create invoice", kind: "invoice" };
}

/** Header action: the current tab's primary create, split with a menu of the others. */
export function PaymentsHeaderActions() {
  const pathname = usePathname();
  const open = use(OpenCreate);
  if (pathname.startsWith("/payments/invoices/")) return null;
  const primary = primaryAction(pathname);
  const mainClass = buttonClass("primary", "rounded-r-none");

  let main: ReactNode;
  switch (primary.kind) {
    case "invoice":
      main = (
        <Link href="/payments/invoices/new" className={mainClass}>
          <Plus /> {primary.label}
        </Link>
      );
      break;
    case "store":
      main = (
        <Link href="/payments/store#settings" className={mainClass}>
          {primary.label}
        </Link>
      );
      break;
    case "service":
    case "subscription":
    case "link": {
      const kind = primary.kind;
      main = (
        <button type="button" className={mainClass} onClick={() => open(kind)}>
          <Plus /> {primary.label}
        </button>
      );
      break;
    }
    default: {
      const unreachable: never = primary.kind;
      return unreachable;
    }
  }

  return (
    <div className="flex">
      {main}
      <Menu
        label="More create options"
        triggerClassName={buttonClass("primary", "rounded-l-none border-l-white/20 px-1.5")}
        trigger={<ChevronDown />}
        items={[
          { label: "Create invoice", href: "/payments/invoices/new" },
          { label: "Create subscription", onSelect: () => open("subscription") },
          { label: "Create payment link", onSelect: () => open("link") },
          { label: "Create service", onSelect: () => open("service") },
        ]}
      />
    </div>
  );
}
