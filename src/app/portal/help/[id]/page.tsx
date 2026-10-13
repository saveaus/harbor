import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { formatDate } from "@/lib/format";
import { requirePortalApp } from "@/lib/portal";

export default async function PortalArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, { supabase, workspace }] = await Promise.all([params, requirePortalApp("helpdesk")]);
  const { data: article, error } = await supabase.from("help_articles").select("title, body, updated_at").eq("workspace_id", workspace.id).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!article) notFound();

  return (
    <div className="flex-1 overflow-y-auto">
      <article className="mx-auto w-full max-w-2xl px-6 py-6">
        <Link href="/portal/help" className="inline-flex items-center gap-1 text-[13px] text-ink-3 hover:text-ink">
          <ChevronLeft size={14} /> Help
        </Link>
        <h1 className="mt-3 text-[22px] font-semibold tracking-tight">{article.title}</h1>
        <p className="mt-1 text-[12px] text-ink-3">Updated {formatDate(article.updated_at)}</p>
        <div className="mt-6 text-[14px] leading-relaxed whitespace-pre-wrap text-ink-2">{article.body}</div>
      </article>
    </div>
  );
}
