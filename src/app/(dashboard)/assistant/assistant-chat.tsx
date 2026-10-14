"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ArrowUp, Sparkles, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { Alert } from "@/components/ui";
import { AssistantParts } from "./assistant-message";

const MAX_INPUT = 2000;

const SUGGESTIONS = [
  "Who doesn't have a driver's licence attached?",
  "Which invoices are still unpaid?",
  "Who hasn't signed their contract yet?",
  "Which staff credentials expire soon?",
];

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
              <p className="mt-1 text-[14px] text-ink-3">Ask about clients, staff, files, invoices, contracts and conversations.</p>
              <div className="mt-6 grid grid-cols-2 gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => submit(suggestion)}
                    className="rounded-card border border-line-strong bg-canvas px-3 py-2.5 text-left text-[13px] text-ink hover:bg-hover"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {messages.map((message) => (
                <div key={message.id} className={clsx(message.role === "user" && "flex justify-end")}>
                  {message.role === "user" ? (
                    <p className="max-w-[85%] rounded-card bg-hover px-3 py-2 text-[14px] leading-6 font-medium text-ink">
                      {message.parts
                        .filter((part) => part.type === "text")
                        .map((part) => part.text)
                        .join("\n")}
                    </p>
                  ) : (
                    <div className="w-full max-w-full">
                      <AssistantParts message={message} disabled={busy} onAsk={submit} />
                    </div>
                  )}
                </div>
              ))}
              {status === "submitted" ? <p className="text-[13px] text-ink-3">Looking that up…</p> : null}
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
