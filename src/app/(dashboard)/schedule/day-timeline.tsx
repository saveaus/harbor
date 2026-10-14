import Link from "next/link";
import { clsx } from "clsx";
import { AlertTriangle } from "lucide-react";
import { Avatar } from "@/components/ui";
import { localParts } from "@/lib/roster";
import { cardRing, cardTitle, cardTone, KindIcon, type BoardCard, type BoardRow } from "./roster-board";

const START = 6;
const END = 22;
const HOURS = Array.from({ length: END - START }, (_, i) => START + i);

function minutes(clock: string): number {
  const [h, m] = clock.split(":").map(Number);
  return h * 60 + m;
}

export function DayTimeline({
  rows,
  cards,
  shifts,
  timeZone,
}: {
  rows: BoardRow[];
  cards: BoardCard[];
  shifts: { id: string; starts_at: string; ends_at: string }[];
  timeZone: string;
}) {
  const span = (END - START) * 60;
  const times = new Map(
    shifts.map((s) => {
      const start = minutes(localParts(s.starts_at, timeZone).clock);
      let end = minutes(localParts(s.ends_at, timeZone).clock);
      if (end <= start) end += 24 * 60;
      return [s.id, { start, end }];
    }),
  );

  return (
    <div className="min-w-[960px] px-9 pb-10">
      <div className="grid grid-cols-[200px_minmax(0,1fr)] border-t border-l border-line">
        <div className="border-r border-b border-line bg-surface px-3 py-2 text-[12px] font-medium text-ink-3">Staff</div>
        <div className="relative border-b border-line bg-surface">
          <div className="grid" style={{ gridTemplateColumns: `repeat(${HOURS.length}, minmax(0, 1fr))` }}>
            {HOURS.map((hour) => (
              <div key={hour} className="border-r border-line px-2 py-2 text-[12px] font-medium text-ink-3">
                {hour === 0 ? "12am" : hour < 12 ? `${hour}am` : hour === 12 ? "12pm" : `${hour - 12}pm`}
              </div>
            ))}
          </div>
        </div>
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
            <div className="relative min-h-[72px] border-b border-line">
              <div className="pointer-events-none absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${HOURS.length}, minmax(0, 1fr))` }}>
                {HOURS.map((hour) => (
                  <div key={hour} className="border-r border-line" />
                ))}
              </div>
              {cards
                .filter((c) => c.rowId === row.id)
                .map((card) => {
                  const range = times.get(card.shiftId);
                  if (!range) return null;
                  const left = ((Math.max(range.start, START * 60) - START * 60) / span) * 100;
                  const width = ((Math.min(range.end, END * 60) - Math.max(range.start, START * 60)) / span) * 100;
                  if (width <= 0) return null;
                  return (
                    <Link
                      key={card.key}
                      href={`/schedule/shifts/${card.shiftId}`}
                      title={cardTitle(card) ?? card.label}
                      className={clsx(
                        "absolute top-1 bottom-1 overflow-hidden rounded-control border px-2 py-1 text-[12px] leading-4 hover:shadow-card",
                        cardTone[card.status],
                        cardRing(card),
                      )}
                      style={{ left: `${left}%`, width: `${Math.max(width, 4)}%` }}
                    >
                      <span className="flex items-center gap-1 font-medium tabular-nums">
                        {card.time} <KindIcon kind={card.kind} />
                      </span>
                      <span className="block truncate text-ink-3">{card.label}</span>
                    </Link>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
