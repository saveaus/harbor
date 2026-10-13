import { PageHeader } from "@/components/ui";
import { requireApp } from "@/lib/workspace";

export default async function HelpdeskLayout({ children }: { children: React.ReactNode }) {
  await requireApp("helpdesk");
  return (
    <>
      <PageHeader title="Help desk" />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
    </>
  );
}
