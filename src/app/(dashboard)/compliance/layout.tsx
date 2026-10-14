import { requireApp } from "@/lib/workspace";
import { ComplianceHeader } from "./compliance-header";

export default async function ComplianceLayout({ children }: { children: React.ReactNode }) {
  await requireApp("compliance");
  return (
    <>
      <ComplianceHeader />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
    </>
  );
}
