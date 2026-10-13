"use client";

import { useActionState } from "react";
import { CopyButton } from "@/components/copy-button";
import { Alert, Button, Input } from "@/components/ui";
import { createApiKey, type ApiKeyState } from "../actions";

export function CreateKeyForm() {
  const [state, action, pending] = useActionState<ApiKeyState, FormData>(createApiKey, {});
  return (
    <div className="space-y-3">
      <form action={action} className="flex gap-2">
        <Input name="name" placeholder="Key name, e.g. Zapier" maxLength={60} required className="max-w-80" />
        <Button type="submit" variant="primary" disabled={pending}>
          Create key
        </Button>
      </form>
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.key ? (
        <div className="rounded-card border border-line-strong bg-surface p-4">
          <p className="text-[13px] font-medium text-ink">Copy your key now. You won&apos;t be able to see it again.</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-control border border-line bg-canvas px-2 py-1.5 font-mono text-[12px]">
              {state.key}
            </code>
            <CopyButton value={state.key} label="Copy" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
