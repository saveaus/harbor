import Link from "next/link";
import { clsx } from "clsx";
import {
  EVIDENCE_AREA,
  EVIDENCE_STATUS,
  OPEN_EVIDENCE,
  readinessHref,
  type EvidenceArea,
  type ReadinessCounts,
} from "@/lib/audit-readiness";

const OPEN_FILL: Record<(typeof OPEN_EVIDENCE)[number], string> = {
  overdue: "bg-danger",
  missing: "bg-ink",
  not_accepted: "bg-warning",
  lapsing: "bg-ink-4",
};

export function ReadinessCharts({ counts }: { counts: ReadinessCounts }) {
  const openTotal = OPEN_EVIDENCE.reduce((sum, status) => sum + counts.open[status], 0);
  return (
    <div className="grid gap-px bg-line-strong sm:grid-cols-3">
      <figure className="bg-canvas p-5">
        <figcaption className="text-[12px] font-medium text-ink-3">Audit readiness</figcaption>
        <p className="mt-3 text-[28px] leading-8 font-medium tracking-[-0.03em] text-ink">
          {counts.current}
          <span className="text-[15px] font-normal text-ink-3"> of {counts.required}</span>
        </p>
        <p className="mt-1 text-[13px] text-ink-3">required items current for the groups you hold</p>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-hover" aria-hidden>
          <div
            className="h-full bg-ink"
            style={{ width: `${counts.required ? Math.round((counts.current / counts.required) * 100) : 0}%` }}
          />
        </div>
      </figure>
      <figure className="bg-canvas p-5">
        <figcaption className="text-[12px] font-medium text-ink-3">Open items</figcaption>
        <p className="mt-3 text-[28px] leading-8 font-medium tracking-[-0.03em] text-ink">{openTotal}</p>
        <p className="mt-1 text-[13px] text-ink-3">overdue first, then missing, not accepted, lapsing</p>
        {openTotal ? (
          <div className="mt-4 flex h-1.5 overflow-hidden rounded-full bg-hover" aria-hidden>
            {OPEN_EVIDENCE.map((status) =>
              counts.open[status] ? (
                <div
                  key={status}
                  className={OPEN_FILL[status]}
                  style={{ width: `${Math.round((counts.open[status] / openTotal) * 100)}%` }}
                />
              ) : null,
            )}
          </div>
        ) : (
          <div className="mt-4 h-1.5 rounded-full bg-hover" aria-hidden />
        )}
        <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
          {OPEN_EVIDENCE.map((status) => (
            <li key={status}>
              <Link href={readinessHref({ status })} className="flex items-center gap-1.5 text-[12px] text-ink-3 hover:text-ink">
                <span className={clsx("size-1.5 rounded-full", OPEN_FILL[status])} />
                {EVIDENCE_STATUS[status].label} {counts.open[status]}
              </Link>
            </li>
          ))}
        </ul>
      </figure>
      <figure className="bg-canvas p-5">
        <figcaption className="text-[12px] font-medium text-ink-3">By area</figcaption>
        <p className="mt-3 text-[13px] text-ink-3">Where the open items sit</p>
        <ul className="mt-4 space-y-2">
          {(Object.keys(EVIDENCE_AREA) as EvidenceArea[]).map((area) => {
            const count = counts.byArea[area];
            const max = Math.max(...(Object.keys(EVIDENCE_AREA) as EvidenceArea[]).map((key) => counts.byArea[key]), 1);
            return (
              <li key={area}>
                <Link href={readinessHref({ area })} className="block hover:text-ink">
                  <div className="flex justify-between gap-3 text-[12px]">
                    <span className="text-ink">{EVIDENCE_AREA[area]}</span>
                    <span className="text-ink-3">{count}</span>
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-hover">
                    <div className="h-full bg-ink" style={{ width: `${Math.round((count / max) * 100)}%` }} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </figure>
    </div>
  );
}
