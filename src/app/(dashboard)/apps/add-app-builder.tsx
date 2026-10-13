"use client";

import { useState } from "react";
import { BarChart3, CalendarClock, CheckCircle2, FolderOpen, Gauge, UserPlus } from "lucide-react";
import { AppPrompt } from "@/components/app-prompt";
import { APP_IDEAS, type IdeaPreview } from "@/lib/app-builder-options";
import { buildApp } from "./custom/actions";

const ideaIcons: Record<IdeaPreview, typeof BarChart3> = {
  bars: BarChart3,
  folders: FolderOpen,
  person: UserPlus,
  calendar: CalendarClock,
  status: CheckCircle2,
  score: Gauge,
};

export function AddAppBuilder() {
  const [prompt, setPrompt] = useState("");

  return (
    <>
      <AppPrompt
        action={buildApp}
        placeholder="Build a tracker for each client's onboarding steps"
        pendingLabel="Building your app. This can take up to a minute…"
        showIdeas
        prompt={prompt}
        onPromptChange={setPrompt}
        autoFocus
        className="max-w-[562px]"
      />

      <h2 className="mt-10 text-[16px] font-medium text-ink">Recommended for you</h2>
      <ul className="mt-4 grid grid-cols-3 gap-4">
        {APP_IDEAS.map((idea) => {
          const Icon = ideaIcons[idea.preview];
          return (
            <li key={idea.name}>
              <button
                type="button"
                onClick={() => setPrompt(idea.prompt)}
                className="block w-full overflow-hidden rounded-card border border-line-strong bg-canvas text-left transition-shadow hover:shadow-card"
              >
                <div className="flex h-[130px] items-center justify-center bg-surface bg-[radial-gradient(#dfe1e4_1px,transparent_1px)] [background-size:10px_10px]">
                  <Preview kind={idea.preview} />
                </div>
                <div className="flex h-[38px] items-center gap-2.5 border-t border-line-strong px-3 text-[13px] text-ink">
                  <span className="flex size-6 items-center justify-center rounded-control border border-line-strong text-ink-3">
                    <Icon size={13} />
                  </span>
                  {idea.name}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function Preview({ kind }: { kind: IdeaPreview }) {
  switch (kind) {
    case "bars":
      return (
        <div className="flex h-20 items-end gap-2.5">
          {[60, 85, 45, 95, 70, 30, 55, 80, 65].map((height, i) => (
            <span key={i} className="relative h-full w-1.5 rounded-full bg-line-strong">
              <span className="absolute inset-x-0 bottom-0 rounded-full bg-link" style={{ height: `${height}%` }} />
            </span>
          ))}
        </div>
      );
    case "folders":
      return (
        <div className="w-40 overflow-hidden rounded-control border border-line-strong bg-canvas text-[10px]">
          <div className="bg-link px-2 py-1.5 font-medium text-white">Requested documents</div>
          {["Signed agreement", "Tax certificate", "Logo files"].map((label, i) => (
            <div key={label} className="flex items-center justify-between border-t border-line px-2 py-1.5">
              {label}
              <span className={i === 0 ? "text-success" : "text-ink-3"}>{i === 0 ? "Received" : "Waiting"}</span>
            </div>
          ))}
        </div>
      );
    case "person":
      return (
        <div className="flex w-44 items-center gap-2 rounded-control border border-line-strong bg-canvas p-2.5 text-[10px] shadow-card">
          <span className="flex size-7 items-center justify-center rounded-full bg-hover text-[10px] font-medium">AL</span>
          <span>
            <span className="block font-medium">Amara Lewis</span>
            <span className="block text-ink-3">Budget $12k · 8 weeks</span>
          </span>
        </div>
      );
    case "calendar":
      return (
        <div className="grid w-40 grid-cols-7 gap-1 rounded-control border border-line-strong bg-canvas p-2">
          {Array.from({ length: 21 }, (_, i) => (
            <span key={i} className={i === 9 ? "h-3 rounded-sm bg-warning" : i === 16 ? "h-3 rounded-sm bg-link" : "h-3 rounded-sm bg-hover"} />
          ))}
        </div>
      );
    case "status":
      return (
        <div className="w-44 space-y-1.5 text-[10px]">
          {[
            ["Homepage concept", "Approved", "bg-success-soft text-success"],
            ["Brand guide v2", "Pending", "bg-hover text-ink-3"],
          ].map(([label, status, tone]) => (
            <div key={label} className="flex items-center justify-between rounded-control border border-line-strong bg-canvas px-2 py-1.5">
              {label}
              <span className={`rounded-full px-1.5 py-0.5 ${tone}`}>{status}</span>
            </div>
          ))}
        </div>
      );
    case "score":
      return (
        <div className="flex items-end gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <span key={n} className={n <= 4 ? "size-5 rounded-full bg-success" : "size-5 rounded-full bg-line-strong"} />
          ))}
        </div>
      );
    default: {
      const unhandled: never = kind;
      return unhandled;
    }
  }
}
