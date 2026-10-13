"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart, getToolName, type UIMessage } from "ai";
import { ArrowUp, Search, Sparkles, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { Alert } from "@/components/ui";

const MAX_INPUT = 2000;

const SUGGESTIONS = [
  "Which invoices are still unpaid?",
  "Who hasn't signed their contract yet?",
  "Summarize my latest conversation with a client",
  "Draft a friendly payment reminder",
];

const TOOL_LABELS: Record<string, string> = {
  findClients: "Searched clients",
  listInvoices: "Checked invoices",
  listContracts: "Checked contracts",
  readConversation: "Read conversation",
};

function MessageParts({ message }: { message: UIMessage }) {
  return message.parts.map((part, index) => {
    if (part.type === "text")
      return (
        <p key={index} className="whitespace-pre-wrap">
          {part.text}
        </p>
      );
    if (isToolUIPart(part))
      return (
        <span key={index} className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-hover px-2 py-0.5 text-[12px] text-ink-3">
          <Search size={11} />
          {TOOL_LABELS[getToolName(part)] ?? "Looked something up"}
          {part.state === "output-error" ? " (failed)" : null}
        </span>
      );
    return null;
  });
}

export function AssistantChat({ firstName }: { firstName: string }) {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error, stop } = useChat({
    transport: new DefaultChatTransport({ api: "/api/assistant" }),
  });
  const busy = status === "submitted" || status === "streaming";
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    void sendMessage({ text: trimmed });
    setInput("");
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[720px] px-6 pt-16 pb-6">
          {messages.length === 0 ? (
            <div className="pt-[12vh]">
              <span className="flex size-10 items-center justify-center rounded-control bg-hover">
                <Sparkles size={18} />
              </span>
              <h1 className="mt-4 text-[24px] leading-8 font-medium text-ink">How can I help, {firstName}?</h1>
              <p className="mt-1 text-[14px] text-ink-3">Ask about your clients, invoices, contracts and conversations.</p>
              <div className="mt-6 grid grid-cols-2 gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => submit(suggestion)}
                    className="rounded-card border border-line-strong bg-canvas px-3 py-2.5 text-left text-[13px] text-ink hover:bg-surface"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message) => (
                <div key={message.id} className={clsx("flex", message.role === "user" && "justify-end")}>
                  <div
                    className={clsx(
                      "max-w-[85%] text-[14px] leading-6 text-ink",
                      message.role === "user" && "rounded-card bg-hover px-3 py-2",
                    )}
                  >
                    <MessageParts message={message} />
                  </div>
                </div>
              ))}
              {status === "submitted" ? <p className="text-[13px] text-ink-3">Thinking…</p> : null}
              {error ? <Alert>Something went wrong. {error.message}</Alert> : null}
              <div ref={endRef} />
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto w-full max-w-[720px] px-6 pb-6">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit(input);
          }}
          className="flex items-end gap-2 rounded-card border border-line-strong bg-canvas p-2 shadow-card focus-within:border-ink-3"
        >
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                submit(input);
              }
            }}
            rows={1}
            maxLength={MAX_INPUT}
            placeholder="Ask the assistant"
            aria-label="Ask the assistant"
            className="max-h-40 min-h-8 flex-1 resize-none bg-transparent px-2 py-1.5 text-[14px] text-ink outline-none [field-sizing:content] placeholder:text-ink-4"
          />
          {busy ? (
            <button
              type="button"
              onClick={() => void stop()}
              aria-label="Stop"
              className="flex size-8 items-center justify-center rounded-full bg-ink text-white"
            >
              <Square size={12} fill="currentColor" />
            </button>
          ) : (
            <button
              type="submit"
              aria-label="Send"
              disabled={!input.trim()}
              className="flex size-8 items-center justify-center rounded-full bg-ink text-white disabled:bg-line-strong"
            >
              <ArrowUp size={15} />
            </button>
          )}
        </form>
        <p className="mt-2 text-center text-[12px] text-ink-4">The assistant can make mistakes. Check important details.</p>
      </div>
    </div>
  );
}
