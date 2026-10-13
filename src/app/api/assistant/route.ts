import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ASSISTANT_MODEL, MAX_ASSISTANT_INPUT, assistantAvailable, assistantInstructions, assistantTools } from "@/lib/assistant";
import { getWorkspace } from "@/lib/workspace";

const HISTORY = 20;

const body = z.object({ messages: z.array(z.custom<UIMessage>((m) => typeof m === "object" && m !== null)).min(1) });

function textLength(message: UIMessage): number {
  return message.parts.reduce((sum, part) => sum + (part.type === "text" ? part.text.length : 0), 0);
}

export async function POST(request: Request) {
  const ctx = await getWorkspace();
  if (!assistantAvailable(ctx.workspace)) return NextResponse.json({ error: "The assistant is turned off." }, { status: 403 });

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Send a list of chat messages." }, { status: 400 });
  const messages = parsed.data.messages.slice(-HISTORY);
  const latest = messages.at(-1);
  if (latest?.role !== "user" || textLength(latest) > MAX_ASSISTANT_INPUT)
    return NextResponse.json({ error: `Keep questions under ${MAX_ASSISTANT_INPUT} characters.` }, { status: 400 });

  const result = streamText({
    model: ASSISTANT_MODEL,
    system: assistantInstructions(ctx),
    messages: await convertToModelMessages(messages),
    tools: assistantTools(ctx),
    stopWhen: isStepCount(5),
  });

  return createUIMessageStreamResponse({ stream: toUIMessageStream({ stream: result.stream }) });
}
