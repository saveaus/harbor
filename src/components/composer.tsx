"use client";

import { Bold, Italic, Link2, List, ListOrdered, SendHorizontal, Strikethrough, Underline } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";

type Format = { label: string; icon: ReactNode; apply: (selected: string) => { text: string; select?: [number, number] } };

const wrap = (marker: string) => (selected: string) => {
  const inner = selected || "text";
  return { text: `${marker}${inner}${marker}`, select: [marker.length, marker.length + inner.length] as [number, number] };
};

const prefixLines = (prefix: (index: number) => string) => (selected: string) => ({
  text: (selected || "")
    .split("\n")
    .map((line, index) => `${prefix(index)}${line}`)
    .join("\n"),
});

const FORMATS: (Format | "divider")[] = [
  { label: "Bold", icon: <Bold />, apply: wrap("**") },
  { label: "Italic", icon: <Italic />, apply: wrap("*") },
  { label: "Underline", icon: <Underline />, apply: wrap("__") },
  { label: "Strikethrough", icon: <Strikethrough />, apply: wrap("~~") },
  "divider",
  { label: "Bulleted list", icon: <List />, apply: prefixLines(() => "- ") },
  { label: "Numbered list", icon: <ListOrdered />, apply: prefixLines((i) => `${i + 1}. `) },
  "divider",
  {
    label: "Link",
    icon: <Link2 />,
    apply: (selected) => {
      const label = selected || "link";
      return { text: `[${label}](https://)`, select: [label.length + 3, label.length + 11] };
    },
  },
];

export function Composer({
  action,
  placeholder = "Write a message",
}: {
  action: (form: FormData) => Promise<void>;
  placeholder?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [empty, setEmpty] = useState(true);

  function format(f: Format) {
    const el = textRef.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end } = el;
    const result = f.apply(el.value.slice(start, end));
    el.focus();
    el.setRangeText(result.text, start, end, result.select ? "preserve" : "end");
    if (result.select) el.setSelectionRange(start + result.select[0], start + result.select[1]);
    setEmpty(el.value.trim() === "");
  }

  return (
    <form
      ref={formRef}
      action={async (form) => {
        await action(form);
        formRef.current?.reset();
        setEmpty(true);
      }}
      className="m-4 overflow-hidden rounded-card border border-line-strong bg-canvas focus-within:border-ink-3"
    >
      <div className="flex items-center gap-0.5 border-b border-line bg-surface px-2 py-1">
        {FORMATS.map((f, index) =>
          f === "divider" ? (
            <span key={index} className="mx-1 h-4 w-px bg-line-strong" />
          ) : (
            <button
              key={f.label}
              type="button"
              aria-label={f.label}
              title={f.label}
              className="flex size-6 items-center justify-center rounded-control text-ink hover:bg-hover [&_svg]:size-3.5"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => format(f)}
            >
              {f.icon}
            </button>
          ),
        )}
      </div>
      <textarea
        ref={textRef}
        name="body"
        rows={2}
        required
        maxLength={10000}
        placeholder={placeholder}
        aria-label={placeholder}
        className="block w-full resize-none bg-transparent px-3 pt-2.5 text-[13px] outline-none placeholder:text-ink-4"
        onInput={(event) => setEmpty(event.currentTarget.value.trim() === "")}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            if (!empty) formRef.current?.requestSubmit();
          }
        }}
      />
      <div className="flex items-center justify-end px-2 pb-2">
        <button
          type="submit"
          aria-label="Send"
          disabled={empty}
          className="flex size-7 items-center justify-center rounded-control bg-accent text-white hover:bg-accent-hover disabled:bg-hover disabled:text-ink-4"
        >
          <SendHorizontal size={14} />
        </button>
      </div>
    </form>
  );
}
