import { generateText, Output } from "ai";
import { z } from "zod";
import { BUILDER_MODELS, type BuilderModel } from "./app-builder-options";
import { APP_PERMISSIONS, parsePermissions, type AppPermission } from "./custom-apps";

const MAX_CODE_BYTES = 200_000;

export type BuilderTurn = { role: "user" | "assistant"; content: string };

export type GeneratedApp = {
  name: string;
  description: string;
  permissions: AppPermission[];
  code: string;
  summary: string;
};

const schema = z.object({
  name: z.string().describe("Short app name, 2 to 4 words, title case."),
  description: z.string().describe("One sentence describing what the app does for staff."),
  permissions: z.array(z.enum(APP_PERMISSIONS)).describe("Only the permissions the code actually uses."),
  code: z.string().describe("The complete app: an HTML body fragment with inline <style> and <script>."),
  summary: z.string().describe("One or two sentences telling the user what you built or changed."),
});

const SYSTEM = `You build small internal tools for Harbor, a client portal that service businesses use to work with their clients.
Staff, not clients, use these tools.

How apps run:
- Your code is inserted into the <body> of a sandboxed iframe. Write an HTML fragment with inline <style> and <script>. No <html>, <head> or <body> tags.
- A strict Content-Security-Policy blocks every network request, external script, stylesheet, font and image URL. Don't use fetch, CDNs, imports or web fonts. Inline SVG and data: URLs are fine.
- localStorage, cookies and parent window access are unavailable.
- The only way to reach data is the global \`harbor\` object. Every method returns a Promise:
  - harbor.clients.list() resolves to { companies: [{ id, name }], contacts: [{ id, name, email, companyId }] }. Needs the "clients:read" permission.
  - harbor.storage.get(key) resolves to the stored JSON value or null.
  - harbor.storage.set(key, value) stores a JSON value of up to 64 KB.
  - harbor.storage.delete(key) and harbor.storage.list() (all keys).
  Storage needs the "storage" permission. Keys are 1 to 100 characters. Storage is shared by all staff.
- Calls can reject. Catch errors and show a readable message in the UI.

How apps should look (match Harbor):
- Font: 13px/1.5 system-ui, sans-serif. Text #212b36, secondary text #6b6f76, borders #eff1f4 or #dfe1e4, subtle backgrounds #f8f9fb, hover #e9ebee, links #0c41bb.
- Buttons: 28px tall, 8px horizontal padding, 4px radius, 13px medium text. Primary is #212b36 with white text. Secondary is white with a #dfe1e4 border.
- Inputs: 36px tall, 12px padding, 4px radius, #dfe1e4 border.
- Cards: white, 1px #dfe1e4 border, 8px radius. Status pills: 25px tall, fully rounded, 13px text, with soft green, amber or grey backgrounds.
- Plain, calm layouts with generous spacing. No gradients, emoji or decorative imagery. Show a helpful empty state when there's no data.

Code quality:
- Build DOM nodes with createElement and textContent. Never put client data into innerHTML.
- Keep everything in one fragment, under about 600 lines.
- Persist anything the user enters with harbor.storage so it survives reloads.

When asked to change an existing app, return the complete updated code, not a diff, and keep everything the user didn't ask to change.`;

export type BuildResult = { app: GeneratedApp } | { error: string };

export async function generateApp({
  instruction,
  model,
  current,
  history,
}: {
  instruction: string;
  model: BuilderModel;
  current?: { name: string; description: string; code: string };
  history: BuilderTurn[];
}): Promise<BuildResult> {
  if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN)
    return { error: "The app builder isn't set up yet. Add an AI Gateway key to enable it." };

  const prompt = current
    ? `Current app "${current.name}" (${current.description}):\n\n<code>\n${current.code}\n</code>\n\nRequested change: ${instruction}`
    : `Build this app: ${instruction}`;

  try {
    const { output } = await generateText({
      model: BUILDER_MODELS[model].model,
      system: SYSTEM,
      messages: [...history.map((turn) => ({ role: turn.role, content: turn.content })), { role: "user" as const, content: prompt }],
      output: Output.object({ schema }),
    });
    const code = output.code.trim();
    if (!code) return { error: "The builder returned an empty app. Try describing it differently." };
    if (new TextEncoder().encode(code).length > MAX_CODE_BYTES)
      return { error: "The generated app was too large. Try asking for something smaller." };
    return {
      app: {
        name: output.name.trim().slice(0, 60) || "Untitled app",
        description: output.description.trim().slice(0, 280),
        permissions: parsePermissions(output.permissions),
        code,
        summary: output.summary.trim().slice(0, 4000) || "Done.",
      },
    };
  } catch (error) {
    console.error("App builder generation failed", error);
    if (error instanceof Error && "statusCode" in error && error.statusCode === 403)
      return { error: `${BUILDER_MODELS[model].label} needs paid AI Gateway credits. Choose another model, or add credits in Vercel.` };
    return { error: "The builder couldn't finish that request. Try again in a moment." };
  }
}
