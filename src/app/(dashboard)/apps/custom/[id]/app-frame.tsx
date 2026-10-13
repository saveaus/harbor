"use client";

import { useEffect, useRef } from "react";
import type { BridgeReply } from "../actions";

/** Calls beyond this are refused until earlier ones finish, so a runaway app can't flood the server. */
const MAX_IN_FLIGHT = 8;

export function AppFrame({
  title,
  srcDoc,
  call,
}: {
  title: string;
  srcDoc: string;
  call: (method: unknown, params: unknown) => Promise<BridgeReply>;
}) {
  const frame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let inFlight = 0;
    async function onMessage(event: MessageEvent) {
      const target = frame.current?.contentWindow;
      if (!target || event.source !== target) return;
      const data: unknown = event.data;
      if (typeof data !== "object" || data === null || !("harbor" in data) || data.harbor !== 1 || !("id" in data)) return;
      const { id } = data;
      const reply = (body: BridgeReply) => target.postMessage({ harbor: 1, id, ...body }, "*");
      if (inFlight >= MAX_IN_FLIGHT) return reply({ error: "Too many requests at once" });
      inFlight += 1;
      try {
        reply(await call("method" in data ? data.method : undefined, "params" in data ? data.params : undefined));
      } catch {
        reply({ error: "Request failed" });
      } finally {
        inFlight -= 1;
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [call]);

  return (
    <iframe
      ref={frame}
      title={title}
      srcDoc={srcDoc}
      sandbox="allow-scripts"
      referrerPolicy="no-referrer"
      className="h-full w-full flex-1 border-0 bg-canvas"
    />
  );
}
