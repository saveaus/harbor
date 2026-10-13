import { Suspense } from "react";
import { createWorkspace } from "@/app/auth-actions";
import { Field, Input, buttonClass } from "@/components/ui";

type OnboardingParams = Promise<{ error?: string }>;

export default function OnboardingPage({ searchParams }: { searchParams: OnboardingParams }) {
  return (
    <main className="flex min-h-full items-center justify-center bg-surface px-4">
      <div className="w-full max-w-[420px] rounded-card border border-line bg-canvas p-6 shadow-control">
        <h1 className="text-[18px] font-semibold">Name your workspace</h1>
        <p className="mt-1 text-[13px] text-ink-3">
          This is the business name your clients will see. We&apos;ll add a sample company so you can try things out.
        </p>
        <Suspense>
          <OnboardingError searchParams={searchParams} />
        </Suspense>
        <form action={createWorkspace} className="mt-5 space-y-4">
          <Field label="Your name">
            <Input name="name" required maxLength={80} placeholder="Jordan Lee" />
          </Field>
          <Field label="Business name">
            <Input name="workspace" required maxLength={60} placeholder="Northwind Studio" />
          </Field>
          <button type="submit" className={buttonClass("primary", "w-full")}>
            Create workspace
          </button>
        </form>
      </div>
    </main>
  );
}

async function OnboardingError({ searchParams }: { searchParams: OnboardingParams }) {
  const { error } = await searchParams;
  return error ? <p className="mt-4 rounded-control bg-danger-soft px-3 py-2 text-[13px] text-danger">{error}</p> : null;
}
