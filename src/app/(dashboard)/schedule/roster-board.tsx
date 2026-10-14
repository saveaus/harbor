"use client";

import Link from "next/link";
import { clsx } from "clsx";
import { AlertTriangle, Moon, Split } from "lucide-react";
import { useState, useTransition } from "react";
import { Avatar } from "@/components/ui";
import type { ShiftKind } from "@/lib/award";
import type { ShiftStatus } from "@/lib/roster";
import { moveShift } from "./actions";

export type BoardRow = { id: string | null; name: string; hours: string; flag: string | null; person: boolean };
export type BoardCard = {
  key: string;
  shiftId: string;
  rowId: string | null;
  day: string;
  time: string;
  label: string;
  status: ShiftStatus;
  kind: ShiftKind;
  clash: boolean;
  issues: string[];
  blocks: string[];
  workers: number;
};

export function cardTitle(card: Pick<BoardCard, "blocks" | "issues">): string | undefined {
  const lines = [...card.blocks, ...card.issues];
  return lines.length ? lines.join("\n") : undefined;
}

export function cardNotice(card: Pick<BoardCard, "blocks" | "issues">): { text: string; tone: "danger" | "warning" } | null {
  if (card.blocks.length === 1) return { text: card.blocks[0], tone: "danger" };
  if (card.blocks.length > 1) return { text: `Can't publish · ${card.blocks.length} reasons`, tone: "danger" };
  if (card.issues.length === 1) return { text: card.issues[0], tone: "warning" };
  if (card.issues.length > 1) return { text: `${card.issues.length} award warnings`, tone: "warning" };
  return null;
}

export function cardRing(card: Pick<BoardCard, "clash" | "blocks" | "issues">): string | false {
  if (!card.clash && card.blocks.length === 0 && card.issues.length === 0) return false;
  return clsx("ring-1", card.clash || card.blocks.length ? "ring-danger" : "ring-warning");
}
export type BoardDay = { day: string; label: string; today: boolean };

export const cardTone: Record<ShiftStatus, string> = {
  unpublished: "border-dashed border-line-strong bg-canvas",
  published: "border-transparent bg-info-soft",
  completed: "border-transparent bg-success-soft",
  cancelled: "border-transparent bg-hover text-ink-3 line-through",
};

const draggable = (card: BoardCard) => card.status === "unpublished" || card.status === "published";

export function KindIcon({ kind }: { kind: ShiftKind }) {
  switch (kind) {
    case "sleepover":
      return <Moon size={11} className="inline" aria-label="Sleepover" />;
    case "broken":
      return <Split size={11} className="inline" aria-label="Broken shift" />;
    case "standard":
      return null;
    default: {
      const unknown: never = kind;
      return unknown;
    }
  }
}

/**
 * A week of shifts in rows. Dragging moves a shift to another day; on the staff
 * view it also hands the shift to the row's worker (or the open row).
 */
export function RosterBoard({
  days,
  rows,
  cards,
  week,
  rowLabel,
  reassign,
}: {
  days: BoardDay[];
  rows: BoardRow[];
  cards: BoardCard[];
  week: string;
  rowLabel: string;
  reassign: boolean;
}) {
  const [dragging, setDragging] = useState<BoardCard | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const drop = (rowId: string | null, day: string) => {
    const card = dragging;
    setDragging(null);
    setTarget(null);
    if (!card) return;
    const changesRow = reassign && card.rowId !== rowId;
    if (!changesRow && card.day === day) return;
    startTransition(() => moveShift(card.shiftId, day, rowId, changesRow, week));
  };

  return (
    <div className={clsx("min-w-[960px] px-9 pb-10", pending && "opacity-60")}>
      <div className="grid grid-cols-[200px_repeat(7,minmax(0,1fr))] border-t border-l border-line">
        <div className="border-r border-b border-line bg-surface px-3 py-2 text-[12px] font-medium text-ink-3">{rowLabel}</div>
        {days.map((d) => (
          <div key={d.day} className={clsx("border-r border-b border-line px-3 py-2 text-[12px] font-medium", d.today ? "bg-info-soft text-link" : "bg-surface text-ink-3")}>
            {d.label}
          </div>
        ))}
        {rows.map((row) => (
          <div key={row.id ?? "none"} className="contents">
            <div className="flex items-center gap-2 border-r border-b border-line px-3 py-2">
              {row.person ? <Avatar name={row.name} size="sm" /> : null}
              <div className="min-w-0 flex-1 leading-4">
                <div className={clsx("truncate text-[13px]", row.id ? "text-ink" : "font-medium text-ink-3")}>{row.name}</div>
                <div className="text-[12px] text-ink-3">{row.hours}</div>
              </div>
              {row.flag ? (
                <span title={row.flag} className="text-warning">
                  <AlertTriangle size={14} />
                </span>
              ) : null}
            </div>
            {days.map((d) => {
              const cellKey = `${row.id ?? "none"}:${d.day}`;
              return (
                <div
                  key={cellKey}
                  className={clsx("min-h-[64px] space-y-1 border-r border-b border-line p-1", target === cellKey && "bg-hover")}
                  onDragOver={(e) => {
                    if (!dragging) return;
                    e.preventDefault();
                    setTarget(cellKey);
                  }}
                  onDragLeave={() => setTarget((t) => (t === cellKey ? null : t))}
                  onDrop={(e) => {
                    e.preventDefault();
                    drop(row.id, d.day);
                  }}
                >
                  {cards
                    .filter((c) => c.rowId === row.id && c.day === d.day)
                    .map((card) => {
                      const notice = cardNotice(card);
                      return (
                        <Link
                          key={card.key}
                          href={`/schedule/shifts/${card.shiftId}`}
                          draggable={draggable(card)}
                          title={cardTitle(card)}
                          onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = "move";
                            e.dataTransfer.setData("text/plain", card.shiftId);
                            setDragging(card);
                          }}
                          onDragEnd={() => {
                            setDragging(null);
                            setTarget(null);
                          }}
                          className={clsx(
                            "block rounded-control border px-2 py-1 text-[12px] leading-4 hover:shadow-card",
                            cardTone[card.status],
                            cardRing(card),
                            draggable(card) && "cursor-grab active:cursor-grabbing",
                          )}
                        >
                          <span className="flex items-center gap-1 font-medium tabular-nums">
                            {card.time} <KindIcon kind={card.kind} />
                          </span>
                          <span className="block truncate text-ink-3">{card.label}</span>
                          {card.clash ? <span className="block text-danger">Overlaps another shift</span> : null}
                          {notice ? <span className={clsx("block", notice.tone === "danger" ? "text-danger" : "text-warning")}>{notice.text}</span> : null}
                          {card.workers > 1 ? <span className="block text-ink-3">{card.workers} staff</span> : null}
                        </Link>
                      );
                    })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
