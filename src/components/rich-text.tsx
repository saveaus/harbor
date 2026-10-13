import type { ReactNode } from "react";

/*
 * Messages store a small markdown subset written by the composer toolbar:
 * **bold**, *italic*, __underline__, ~~strike~~, [label](https://…), "- " bullets and "1. " numbered lines.
 * It renders to React elements only, so message text can never inject markup.
 */

const INLINE = /(\*\*[^*\n]+\*\*|__[^_\n]+__|~~[^~\n]+~~|\*[^*\n]+\*|\[[^\]\n]+\]\([^)\s]+\))/g;

function safeHref(raw: string): string | null {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:" || url.protocol === "mailto:" ? url.href : null;
  } catch {
    return null;
  }
}

function inline(text: string, keyPrefix: string): ReactNode[] {
  return text.split(INLINE).map((part, index) => {
    const key = `${keyPrefix}-${index}`;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) return <strong key={key}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("__") && part.endsWith("__") && part.length > 4) return <u key={key}>{part.slice(2, -2)}</u>;
    if (part.startsWith("~~") && part.endsWith("~~") && part.length > 4) return <s key={key}>{part.slice(2, -2)}</s>;
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) return <em key={key}>{part.slice(1, -1)}</em>;
    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
    if (link) {
      const href = safeHref(link[2]!);
      return href ? (
        <a key={key} href={href} target="_blank" rel="noopener noreferrer" className="text-link hover:underline">
          {link[1]}
        </a>
      ) : (
        part
      );
    }
    return part;
  });
}

type Block = { kind: "p"; lines: string[] } | { kind: "ul" | "ol"; items: string[] };

function blocks(source: string): Block[] {
  const result: Block[] = [];
  for (const line of source.split(/\r?\n/)) {
    const bullet = /^\s*[-•]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    const kind = bullet ? "ul" : numbered ? "ol" : "p";
    const last = result.at(-1);
    if (kind === "p") {
      if (last?.kind === "p") last.lines.push(line);
      else result.push({ kind: "p", lines: [line] });
    } else {
      const item = (bullet ?? numbered)![1]!;
      if (last?.kind === kind) last.items.push(item);
      else result.push({ kind, items: [item] });
    }
  }
  return result;
}

/** Plain-text preview of a message, for channel summaries and notifications. */
export function stripFormatting(source: string): string {
  return source
    .replace(/\[([^\]\n]+)\]\([^)\s]+\)/g, "$1")
    .replace(/(\*\*|__|~~)([^\n]+?)\1/g, "$2")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/^\s*(?:[-•]|\d+[.)])\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function RichText({ source }: { source: string }) {
  return (
    <div className="space-y-1.5 break-words">
      {blocks(source).map((block, index) =>
        block.kind === "p" ? (
          <p key={index} className="whitespace-pre-wrap">
            {block.lines.flatMap((line, i) => (i === 0 ? inline(line, `${index}-${i}`) : ["\n", ...inline(line, `${index}-${i}`)]))}
          </p>
        ) : block.kind === "ul" ? (
          <ul key={index} className="list-disc pl-5">
            {block.items.map((item, i) => (
              <li key={i}>{inline(item, `${index}-${i}`)}</li>
            ))}
          </ul>
        ) : (
          <ol key={index} className="list-decimal pl-5">
            {block.items.map((item, i) => (
              <li key={i}>{inline(item, `${index}-${i}`)}</li>
            ))}
          </ol>
        ),
      )}
    </div>
  );
}
