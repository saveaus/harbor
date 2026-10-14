"use client";

import { isToolUIPart, getToolName, type UIMessage } from "ai";
import { Search } from "lucide-react";
import { Chip } from "@/components/record-list";
import { Avatar, Button, ButtonLink } from "@/components/ui";
import type { ChipTone } from "@/lib/care";

const TOOL_LABELS: Record<string, string> = {
  findClients: "Searched clients",
  findStaff: "Searched staff",
  listClientDocuments: "Checked client files",
  listStaffCredentials: "Checked staff credentials",
  whoIsMissingDocument: "Checked document attachments",
  listInvoices: "Checked invoices",
  listContracts: "Checked contracts",
  readConversation: "Read conversation",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asList(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function BoldText({ value }: { value: string }) {
  return value.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={index} className="font-medium text-ink">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={index}>{part}</span>
    ),
  );
}

export function AssistantText({ text: value }: { text: string }) {
  const blocks = value.trim().split(/\n{2,}/).filter(Boolean);
  return (
    <div className="space-y-2">
      {blocks.map((block, index) => {
        const lines = block.split("\n");
        const listed = lines.every((line) => !line.trim() || /^[-*•]/.test(line.trim()));
        if (listed) {
          return (
            <ul key={index} className="space-y-1 text-[14px] leading-6 text-ink">
              {lines
                .map((line) => line.replace(/^[-*•]\s*/, "").trim())
                .filter(Boolean)
                .map((line) => (
                  <li key={line} className="flex gap-2">
                    <span className="mt-2 size-1 shrink-0 rounded-full bg-ink-3" />
                    <span>
                      <BoldText value={line} />
                    </span>
                  </li>
                ))}
            </ul>
          );
        }
        if (index === 0 && lines.length === 1 && lines[0].length <= 90) {
          return (
            <h2 key={index} className="text-[16px] leading-6 font-medium text-ink">
              <BoldText value={lines[0]} />
            </h2>
          );
        }
        return (
          <p key={index} className="text-[14px] leading-6 text-ink">
            <BoldText value={block} />
          </p>
        );
      })}
    </div>
  );
}

function PersonRow({
  name,
  detail,
  chip,
  tone,
  href,
  onDraft,
  disabled,
}: {
  name: string;
  detail?: string;
  chip?: string;
  tone?: ChipTone;
  href?: string;
  onDraft?: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <Avatar name={name} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-ink">{name}</p>
        {detail ? <p className="truncate text-[12px] leading-4 text-ink-3">{detail}</p> : null}
      </div>
      {chip ? <Chip tone={tone}>{chip}</Chip> : null}
      {href ? (
        <ButtonLink href={href} variant="ghost">
          Open
        </ButtonLink>
      ) : null}
      {onDraft ? (
        <Button type="button" variant="ghost" disabled={disabled} onClick={onDraft}>
          Draft
        </Button>
      ) : null}
    </div>
  );
}

function RecordRow({ title, detail, chip, tone, href }: { title: string; detail?: string; chip?: string; tone?: ChipTone; href?: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-ink">{title}</p>
        {detail ? <p className="truncate text-[12px] leading-4 text-ink-3">{detail}</p> : null}
      </div>
      {chip ? <Chip tone={tone}>{chip}</Chip> : null}
      {href ? (
        <ButtonLink href={href} variant="ghost">
          Open
        </ButtonLink>
      ) : null}
    </div>
  );
}

/** UI only when staff can act on a set of records. Lookups and summaries stay as text. */
function ActionList({
  output,
  name,
  disabled,
  onAsk,
}: {
  output: unknown;
  name: string;
  disabled: boolean;
  onAsk: (prompt: string) => void;
}) {
  if (isRecord(output) && text(output.error)) return null;

  if (name === "whoIsMissingDocument" && isRecord(output)) {
    const document = text(output.document) || "document";
    const people = [
      ...asList(isRecord(output.clients) ? output.clients.missing : []).map((row) => ({
        kind: "Client",
        id: text(row.id),
        name: text(row.name),
        email: text(row.email),
        href: text(row.id) ? `/clients/${text(row.id)}` : undefined,
      })),
      ...asList(isRecord(output.staff) ? output.staff.missing : []).map((row) => ({
        kind: "Staff",
        id: text(row.id),
        name: text(row.name),
        email: text(row.email),
        href: text(row.id) ? `/staff/${text(row.id)}` : undefined,
      })),
    ];
    if (!people.length) return null;
    return (
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[12px] font-medium text-ink-3">
            Missing {document} <Chip tone="amber">{people.length}</Chip>
          </div>
          {people.length > 1 ? (
            <Button
              type="button"
              variant="secondary"
              disabled={disabled}
              onClick={() =>
                onAsk(`Draft a short message asking ${people.map((row) => text(row.name)).join(", ")} to attach their ${document.toLowerCase()}.`)
              }
            >
              Draft reminder
            </Button>
          ) : null}
        </div>
        <div className="mt-1 divide-y divide-line">
          {people.map((row) => (
            <PersonRow
              key={`${text(row.kind)}-${text(row.id) || text(row.email)}`}
              name={text(row.name) || "Unknown"}
              detail={text(row.email)}
              chip={text(row.kind)}
              tone={text(row.kind) === "Staff" ? "purple" : "blue"}
              href={row.href}
              disabled={disabled}
              onDraft={() => onAsk(`Draft a short message to ${text(row.name)} asking them to attach their ${document.toLowerCase()}.`)}
            />
          ))}
        </div>
      </div>
    );
  }

  if (name === "listInvoices") {
    const open = asList(output).filter((row) => text(row.status) === "open");
    if (!open.length) return null;
    return (
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[12px] font-medium text-ink-3">
            Unpaid invoices <Chip tone="amber">{open.length}</Chip>
          </div>
          {open.length > 1 ? (
            <Button
              type="button"
              variant="secondary"
              disabled={disabled}
              onClick={() => onAsk("Draft a friendly payment reminder for the unpaid invoices.")}
            >
              Draft reminder
            </Button>
          ) : null}
        </div>
        <div className="mt-1 divide-y divide-line">
          {open.map((row) => (
            <RecordRow
              key={text(row.id) || text(row.number)}
              title={text(row.number)}
              detail={[text(row.billedTo), text(row.total), text(row.due) ? `Due ${text(row.due)}` : ""].filter(Boolean).join(" · ")}
              chip="Open"
              tone="amber"
              href={text(row.id) ? `/payments/invoices/${text(row.id)}` : undefined}
            />
          ))}
        </div>
      </div>
    );
  }

  if (name === "listContracts") {
    const waiting = asList(output).filter((row) => text(row.status) === "awaiting_signature");
    if (!waiting.length) return null;
    return (
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[12px] font-medium text-ink-3">
            Waiting on a signature <Chip tone="amber">{waiting.length}</Chip>
          </div>
          {waiting.length > 1 ? (
            <Button
              type="button"
              variant="secondary"
              disabled={disabled}
              onClick={() => onAsk("Draft a short reminder asking clients to sign their contract.")}
            >
              Draft reminder
            </Button>
          ) : null}
        </div>
        <div className="mt-1 divide-y divide-line">
          {waiting.map((row) => (
            <RecordRow
              key={text(row.id) || text(row.name)}
              title={text(row.name)}
              detail={[text(row.client), text(row.sent) ? `Sent ${text(row.sent)}` : ""].filter(Boolean).join(" · ")}
              chip="Awaiting signature"
              tone="amber"
              href={text(row.id) ? `/contracts/${text(row.id)}` : undefined}
            />
          ))}
        </div>
      </div>
    );
  }

  return null;
}

function repeatsActionList(block: string): boolean {
  const compact = block.replace(/\s+/g, " ").trim();
  if (/missing\*\*/i.test(compact) || /^\*?missing:/i.test(compact)) return true;
  if ((compact.match(/@/g) ?? []).length >= 2) return true;
  return compact.split(/[;,] /).length >= 4;
}

export function AssistantParts({
  message,
  disabled,
  onAsk,
}: {
  message: UIMessage;
  disabled: boolean;
  onAsk: (prompt: string) => void;
}) {
  const tools = message.parts.filter(isToolUIPart);
  const answer = message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("\n\n")
    .trim();
  const actions = tools.flatMap((part) =>
    part.state === "output-available" ? [<ActionList key={part.toolCallId} name={getToolName(part)} output={part.output} disabled={disabled} onAsk={onAsk} />] : [],
  );
  const shown = answer
    .split(/\n{2,}/)
    .filter((block) => (actions.length ? !repeatsActionList(block) : true))
    .join("\n\n");

  return (
    <div className="space-y-3">
      {tools.length ? (
        <div className="flex flex-wrap gap-1.5">
          {tools.map((part) => (
            <span key={part.toolCallId} className="inline-flex items-center gap-1.5 rounded-full bg-hover px-2 py-0.5 text-[12px] text-ink-3">
              <Search size={11} />
              {TOOL_LABELS[getToolName(part)] ?? "Looked something up"}
              {part.state === "output-error" ? " (failed)" : part.state !== "output-available" ? "…" : null}
            </span>
          ))}
        </div>
      ) : null}
      {shown ? <AssistantText text={shown} /> : null}
      {actions}
    </div>
  );
}

