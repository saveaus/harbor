import type { ReactNode } from "react";

/** Full-page empty state for a Payments tab, with a schematic preview of the finished thing. */
export function PaymentsHero({ title, body, action, preview }: { title: string; body: string; action: ReactNode; preview: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-9 pt-16 pb-12 text-center">
      <h2 className="max-w-[360px] text-[24px] leading-8 font-medium text-ink">{title}</h2>
      <p className="mt-3 max-w-[360px] text-[14px] leading-6 text-ink-3">{body}</p>
      <div className="mt-6">{action}</div>
      <div aria-hidden className="mt-6 w-full max-w-[680px] rounded-card bg-hover/70 p-6">
        <div className="rounded-control bg-canvas p-5 text-left shadow-card">{preview}</div>
      </div>
    </div>
  );
}

function Bar({ w, dark }: { w: string; dark?: boolean }) {
  return <div className={`h-2 rounded-full ${dark ? "bg-ink/70" : "bg-hover"}`} style={{ width: w }} />;
}

export function DocumentPreview({ heading }: { heading: string }) {
  return (
    <div className="grid grid-cols-[1fr_1.2fr] gap-6">
      <div className="space-y-3">
        <div className="text-[11px] font-medium">{heading}</div>
        <Bar w="70%" />
        <Bar w="90%" />
        <Bar w="55%" />
        <div className="pt-3">
          <Bar w="40%" />
        </div>
        <Bar w="85%" />
      </div>
      <div className="space-y-2 rounded-control border border-line p-4">
        <div className="flex justify-between">
          <Bar w="30%" dark />
          <div className="size-5 rounded bg-ink/70" />
        </div>
        <Bar w="50%" />
        <Bar w="45%" />
        <div className="space-y-1.5 border-t border-line pt-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex justify-between">
              <Bar w="40%" />
              <Bar w="15%" />
            </div>
          ))}
        </div>
        <div className="flex justify-end pt-2">
          <Bar w="25%" dark />
        </div>
      </div>
    </div>
  );
}

export function CardsPreview({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="space-y-2 rounded-control border border-line p-3">
          <div className="h-12 rounded bg-hover" />
          <Bar w="70%" dark />
          <Bar w="40%" />
          <div className="h-5 w-16 rounded bg-ink/70" />
        </div>
      ))}
    </div>
  );
}
