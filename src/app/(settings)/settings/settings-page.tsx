import type { ReactNode } from "react";
import { Alert, Button } from "@/components/ui";

export type SettingsSearchParams = Promise<{ error?: string; saved?: string }>;

export async function SettingsNotice({ searchParams }: { searchParams: SettingsSearchParams }) {
  const { error, saved } = await searchParams;
  if (!error && !saved) return null;
  return <div className="mb-6">{error ? <Alert>{error}</Alert> : <Alert tone="success">Changes saved.</Alert>}</div>;
}

export function SettingsTitle({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-8 border-b border-line pb-8">
      <h1 className="text-[20px] leading-7 font-medium text-ink">{title}</h1>
      {children ? <p className="mt-1.5 max-w-[560px] text-[13px] text-ink-3">{children}</p> : null}
    </div>
  );
}

export function SettingsSection({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <section className="mb-10">
      <div className="mb-5 border-b border-line pb-5">
        <h2 className="text-[16px] leading-6 font-medium text-ink">{title}</h2>
        {description ? <p className="mt-0.5 max-w-[560px] text-[13px] text-ink-3">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

/** A labelled on/off setting that submits "on" with its form when switched on. */
export function SwitchRow({
  name,
  label,
  description,
  defaultChecked,
  disabled,
}: {
  name: string;
  label: string;
  description?: string;
  defaultChecked: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-6 py-3 has-disabled:cursor-default">
      <span>
        <span className="block text-[13px] font-medium text-ink">{label}</span>
        {description ? <span className="mt-0.5 block text-[13px] text-ink-3">{description}</span> : null}
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input type="checkbox" role="switch" name={name} defaultChecked={defaultChecked} disabled={disabled} className="peer sr-only" />
        <span className="h-4 w-7 rounded-full bg-line-strong transition-colors peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent/40 peer-disabled:opacity-50" />
        <span className="absolute top-0.5 left-0.5 size-3 rounded-full bg-white shadow-control transition-transform peer-checked:translate-x-3" />
      </span>
    </label>
  );
}

export function SaveBar({ label = "Save changes" }: { label?: string }) {
  return (
    <div className="flex justify-end border-t border-line pt-5">
      <Button type="submit" variant="primary">
        {label}
      </Button>
    </div>
  );
}
