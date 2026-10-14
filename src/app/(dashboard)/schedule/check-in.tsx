"use client";

import { MapPin } from "lucide-react";
import { useState } from "react";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { checkIn, checkOut } from "./actions";

export function CheckIn({
  entryId,
  mode,
  defaultKm = 0,
}: {
  entryId: string;
  mode: "in" | "out";
  defaultKm?: number;
}) {
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<"idle" | "busy" | "failed">("idle");
  const action = mode === "in" ? checkIn.bind(null, entryId) : checkOut.bind(null, entryId);

  const submit = (form: FormData) => {
    if (!navigator.geolocation) return action(form);
    setStatus("busy");
    return new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          form.set("latitude", position.coords.latitude.toFixed(6));
          form.set("longitude", position.coords.longitude.toFixed(6));
          form.set("accuracy", String(Math.round(position.coords.accuracy)));
          resolve(action(form));
        },
        () => {
          setStatus("failed");
          resolve(action(form));
        },
        { enableHighAccuracy: true, timeout: 10_000 },
      );
    });
  };

  if (mode === "in") {
    return (
      <form action={submit} className="flex flex-wrap items-end gap-2">
        <Field label="Reason if you're away from the pin">
          <Input name="reason" maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional" />
        </Field>
        <Button type="submit" variant="primary" disabled={status === "busy"}>
          <MapPin size={14} /> {status === "busy" ? "Locating…" : "Check in"}
        </Button>
        {status === "failed" ? <span className="text-[12px] text-warning">Location isn&apos;t available; checking in without a pin.</span> : null}
      </form>
    );
  }

  return (
    <form action={submit} className="grid gap-3">
      <Field label="Support note" hint="Required to check out and to complete the shift. Copied to the participant's notes.">
        <Textarea name="note" required maxLength={20000} rows={4} placeholder="What support was delivered" />
      </Field>
      <div className="flex flex-wrap items-end gap-2">
        <Field label="Kilometres">
          <Input name="km" type="number" min={0} max={2000} step="0.1" defaultValue={defaultKm || 0} className="w-28" />
        </Field>
        <Button type="submit" variant="primary" disabled={status === "busy"}>
          <MapPin size={14} /> {status === "busy" ? "Locating…" : "Check out"}
        </Button>
      </div>
      {status === "failed" ? <span className="text-[12px] text-warning">Location isn&apos;t available; checking out without a pin.</span> : null}
    </form>
  );
}
