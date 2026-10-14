import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui";
import { POLICY_KIND, getPolicyTemplate } from "@/lib/policy-library";
import { requireApp } from "@/lib/workspace";
import { copyPolicyTemplate } from "../../actions";

export default async function PolicyTemplatePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { supabase } = await requireApp("compliance");
  const template = await getPolicyTemplate(supabase, slug);
  if (!template) notFound();

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <article className="mx-auto w-full max-w-3xl px-6 py-6">
        <Link href="/compliance/library" className="inline-flex items-center gap-1 text-[13px] text-ink-3 hover:text-ink">
          <ChevronLeft size={14} /> Library
        </Link>
        <p className="mt-4 text-[12px] text-ink-3">
          {POLICY_KIND[template.kind]} · {template.category} · v{template.version}
        </p>
        <h1 className="mt-1 text-[24px] font-medium">{template.title}</h1>
        {template.summary ? <p className="mt-3 text-[14px] leading-6 text-ink-2">{template.summary}</p> : null}
        <div className="mt-4 text-[14px] leading-6 whitespace-pre-wrap">{template.body || "This template has no body yet."}</div>
        <form action={copyPolicyTemplate.bind(null, template.slug)} className="mt-8 border-t border-line pt-4">
          <Button type="submit" variant="primary">
            Copy into documents
          </Button>
          <p className="mt-2 text-[13px] text-ink-3">Creates a draft your organisation can edit. The template itself stays in the library.</p>
        </form>
      </article>
    </div>
  );
}
