import Link from "next/link";
import { Library } from "lucide-react";
import { EmptyState } from "@/components/ui";
import { POLICY_KIND, listPolicyTemplates } from "@/lib/policy-library";
import type { Enums } from "@/lib/supabase/database.types";
import { requireApp } from "@/lib/workspace";

export default async function PolicyLibraryPage() {
  const { supabase } = await requireApp("compliance");
  const templates = await listPolicyTemplates(supabase);
  const kinds = Object.keys(POLICY_KIND) as Enums<"policy_kind">[];

  if (templates.length === 0) {
    return (
      <EmptyState
        icon={<Library size={18} />}
        title="Policy and procedure library"
        body="Templates will be added here. They stay separate from the documents your organisation keeps. When a template is available, copy it into Documents as a draft and edit that copy."
      />
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-5xl px-9 py-8">
        <h1 className="text-[20px] font-medium">Policy and procedure library</h1>
        <p className="mt-1 max-w-2xl text-[13px] leading-5 text-ink-3">
          Templates are shared starting points. Copying one creates a draft in Documents, which is the copy your organisation keeps.
        </p>
        {kinds.map((kind) => {
          const items = templates.filter((template) => template.kind === kind);
          return (
            <section key={kind} className="mt-8">
              <h2 className="text-[16px] font-medium">{POLICY_KIND[kind]}</h2>
              {items.length === 0 ? <p className="mt-2 text-[13px] text-ink-3">None yet.</p> : null}
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {items.map((template) => (
                  <li key={template.id}>
                    <Link href={`/compliance/library/${template.slug}`} className="block rounded-card border border-line-strong p-4 transition-colors hover:bg-hover">
                      <span className="text-[14px] font-medium text-ink">{template.title}</span>
                      <p className="mt-1 text-[12px] text-ink-3">
                        {template.category} · v{template.version}
                      </p>
                      {template.summary ? <p className="mt-2 text-[13px] leading-5 text-ink-3">{template.summary}</p> : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
