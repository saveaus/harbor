import type { Enums } from "@/lib/supabase/database.types";

export const contractStatus: Record<
  Enums<"contract_status">,
  { label: string; tone: "warning" | "success" | "danger" }
> = {
  awaiting_signature: { label: "Awaiting signature", tone: "warning" },
  signed: { label: "Signed", tone: "success" },
  declined: { label: "Declined", tone: "danger" },
};
