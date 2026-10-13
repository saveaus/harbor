import { PageHeader } from "@/components/ui";
import { requireApp } from "@/lib/workspace";

export default async function FormsLayout({ children }: { children: React.ReactNode }) {
  await requireApp("forms");
  return (
    <>
      <PageHeader title="Forms" />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
    </>
  );
}
