"use client";

import { useActionState, useRef, useState } from "react";
import { ArrowUp, ChevronDown, Lightbulb, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { APP_IDEAS, BUILDER_MODELS, BUILDER_MODEL_KEYS, MAX_PROMPT_CHARS, type BuilderModel } from "@/lib/app-builder-options";
import { Menu } from "./menu";

type BuilderAction = (state: { error?: string }, form: FormData) => Promise<{ error?: string }>;

/** Prompt box for the AI app builder. `prompt`/`onPromptChange` let a parent fill it from elsewhere on the page. */
export function AppPrompt({
  action,
  placeholder,
  pendingLabel,
  showIdeas = false,
  prompt: controlled,
  onPromptChange,
  autoFocus,
  className,
}: {
  action: BuilderAction;
  placeholder: string;
  pendingLabel: string;
  showIdeas?: boolean;
  prompt?: string;
  onPromptChange?: (value: string) => void;
  autoFocus?: boolean;
  className?: string;
}) {
  const [local, setLocal] = useState("");
  const prompt = controlled ?? local;
  const setPrompt = onPromptChange ?? setLocal;
  const [model, setModel] = useState<BuilderModel>("auto");
  const form = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(async (previous: { error?: string }, data: FormData) => {
    const next = await action(previous, data);
    if (!next.error) setPrompt("");
    return next;
  }, {});
  const empty = prompt.trim().length === 0;

  return (
    <form ref={form} action={formAction} className={className}>
      <div
        className={clsx(
          "rounded-card border border-line-strong bg-canvas shadow-card transition-colors focus-within:border-ink-3",
          pending && "opacity-70",
        )}
      >
        <textarea
          name="prompt"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              if (!empty && !pending) form.current?.requestSubmit();
            }
          }}
          placeholder={placeholder}
          maxLength={MAX_PROMPT_CHARS}
          rows={3}
          readOnly={pending}
          autoFocus={autoFocus}
          aria-label="Describe your app"
          className="block w-full resize-none bg-transparent px-3 pt-3 text-[14px] leading-6 text-ink outline-none placeholder:text-ink-3"
        />
        <input type="hidden" name="model" value={model} />
        <div className="flex h-12 items-center gap-1 px-2">
          {showIdeas ? (
            <Menu
              label="Ideas"
              align="start"
              triggerClassName="inline-flex h-7 items-center gap-1 rounded-control px-2 text-[13px] font-medium text-ink hover:bg-hover"
              trigger={
                <>
                  <Lightbulb size={13} /> Ideas <ChevronDown size={13} />
                </>
              }
              items={APP_IDEAS.map((idea) => ({ label: idea.name, onSelect: () => setPrompt(idea.prompt) }))}
            />
          ) : null}
          <span className="flex-1 truncate px-1 text-[12px] text-ink-3">{pending ? pendingLabel : null}</span>
          <Menu
            label="Model"
            triggerClassName="inline-flex h-7 items-center gap-1 rounded-control px-2 text-[13px] text-ink-3 hover:bg-hover hover:text-ink"
            trigger={
              <>
                {BUILDER_MODELS[model].label} <ChevronDown size={13} />
              </>
            }
            items={BUILDER_MODEL_KEYS.map((key) => ({ label: BUILDER_MODELS[key].label, onSelect: () => setModel(key) }))}
          />
          <button
            type="submit"
            aria-label="Build"
            disabled={empty || pending}
            className="inline-flex size-7 items-center justify-center rounded-control bg-ink text-white disabled:bg-hover disabled:text-ink-3"
          >
            {pending ? <Loader2 size={14} className="animate-spin" /> : <ArrowUp size={14} />}
          </button>
        </div>
      </div>
      {state.error ? <p className="mt-2 text-[13px] text-danger">{state.error}</p> : null}
    </form>
  );
}
