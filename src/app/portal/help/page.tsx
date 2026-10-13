import Link from "next/link";
import { BookOpen, ChevronRight } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/ui";
import { requirePortalApp } from "@/lib/portal";

export default async function PortalHelpPage() {
  const { supabase, workspace } = await requirePortalApp("helpdesk");
  const { data: articles, error } = await supabase.from("help_articles").select("id, title, body").eq("workspace_id", workspace.id).order("title");
  if (error) throw error;

  return (
    <>
      <PageHeader title="Help" />
      <div className="flex-1 overflow-y-auto">
        {articles.length === 0 ? (
          <EmptyState icon={<BookOpen size={18} />} title="No articles yet" body="Guides and answers will appear here." />
        ) : (
          <ul className="mx-auto max-w-3xl px-6 py-6">
            {articles.map((article) => (
              <li key={article.id} className="border-b border-line last:border-0">
                <Link href={`/portal/help/${article.id}`} className="flex items-center gap-3 rounded-control px-3 py-3 hover:bg-surface">
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium">{article.title}</div>
                    <div className="truncate text-[12px] text-ink-3">{article.body.slice(0, 160)}</div>
                  </div>
                  <ChevronRight size={14} className="text-ink-4" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
