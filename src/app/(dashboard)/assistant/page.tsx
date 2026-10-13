import { redirect } from "next/navigation";
import { assistantAvailable } from "@/lib/assistant";
import { getWorkspace } from "@/lib/workspace";
import { AssistantChat } from "./assistant-chat";

export default async function AssistantPage() {
  const { workspace, member } = await getWorkspace();
  if (!assistantAvailable(workspace)) redirect("/settings/assistant");
  const firstName = (member.display_name || member.email).split(/\s+/)[0];
  return <AssistantChat firstName={firstName} />;
}
