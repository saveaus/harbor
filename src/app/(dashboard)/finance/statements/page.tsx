import { ScrollText } from "lucide-react";
import { EmptyState } from "@/components/ui";
import { requireApp } from "@/lib/workspace";

export default async function StatementsPage() {
  await requireApp("finance");
  return (
    <div className="py-2">
      <div className="px-9 pt-5">
        <h1 className="text-[16px] font-medium">Statements</h1>
      </div>
      <EmptyState icon={<ScrollText size={18} />} title="No statement periods" body="Statement periods show up here when statements are generated." />
    </div>
  );
}
