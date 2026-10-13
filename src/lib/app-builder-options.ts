export const BUILDER_MODEL_KEYS = ["auto", "fast", "best"] as const;

export type BuilderModel = (typeof BUILDER_MODEL_KEYS)[number];

export const BUILDER_MODELS: Record<BuilderModel, { label: string; model: string }> = {
  auto: { label: "Auto", model: "openai/gpt-5" },
  fast: { label: "Fast", model: "openai/gpt-5-mini" },
  best: { label: "Best", model: "anthropic/claude-opus-5.5" },
};

export function parseBuilderModel(value: string): BuilderModel {
  return BUILDER_MODEL_KEYS.find((key) => key === value) ?? "auto";
}

export const MAX_PROMPT_CHARS = 2000;

export type IdeaPreview = "bars" | "folders" | "person" | "calendar" | "status" | "score";

export const APP_IDEAS: readonly { name: string; preview: IdeaPreview; prompt: string }[] = [
  { name: "Client project tracker", preview: "bars", prompt: "Track each client's project stage (Kickoff, In progress, Review, Done) with a progress bar per client and a summary of how many are in each stage." },
  { name: "Document collector", preview: "folders", prompt: "A checklist of documents I need from each client. I can add document names, tick them off per client, and see who still owes me what." },
  { name: "New client intake", preview: "person", prompt: "An intake form for new clients that records their goals, budget and timeline, and lists submitted intakes with the newest first." },
  { name: "Renewal tracker", preview: "calendar", prompt: "Track contract renewal dates per client, highlight renewals due in the next 30 days, and let me mark them as renewed." },
  { name: "Design approvals", preview: "status", prompt: "Log design deliverables per client with a status of Pending, Approved or Changes requested, and filter by status." },
  { name: "Client health score", preview: "score", prompt: "Score each client's health from 1 to 5 with a note, show the average, and sort clients from lowest to highest score." },
];
