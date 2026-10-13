import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Trash2 } from "lucide-react";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { requireApp } from "@/lib/workspace";
import { deleteArticle, saveArticle } from "../actions";

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, workspace } = await requireApp("helpdesk");
  const { data: article, error } = await supabase
    .from("help_articles")
    .select("*")
    .eq("workspace_id", workspace.id)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!article) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-6">
      <div className="flex items-center justify-between">
        <Link href="/helpdesk" className="inline-flex items-center gap-1 text-[13px] text-ink-3 hover:text-ink">
          <ChevronLeft size={14} /> Articles
        </Link>
        <form action={deleteArticle.bind(null, article.id)}>
          <Button type="submit" variant="danger">
            <Trash2 size={14} /> Delete
          </Button>
        </form>
      </div>
      <form action={saveArticle.bind(null, article.id)} className="mt-4 space-y-4">
        <Field label="Title">
          <Input name="title" defaultValue={article.title} required maxLength={200} />
        </Field>
        <Field label="Article">
          <Textarea name="body" rows={18} defaultValue={article.body} placeholder="Write your answer…" />
        </Field>
        <div className="flex items-center justify-between border-t border-line pt-4">
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" name="published" defaultChecked={article.published} className="accent-[var(--color-accent)]" />
            Published to the client portal
          </label>
          <Button type="submit" variant="primary">
            Save article
          </Button>
        </div>
      </form>
    </div>
  );
}
