/** Accepts "1:30", "1.5", "90m" or "2h"; returns whole minutes, or undefined when unreadable or out of range. */
export function parseDuration(value: string): number | undefined {
  const input = value.trim().toLowerCase();
  let minutes: number;
  const clock = /^(\d{1,2}):([0-5]\d)$/.exec(input);
  const suffixed = /^(\d+(?:\.\d+)?)\s*(h|m)$/.exec(input);
  if (clock) minutes = Number(clock[1]) * 60 + Number(clock[2]);
  else if (suffixed) minutes = Number(suffixed[1]) * (suffixed[2] === "h" ? 60 : 1);
  else if (/^\d+(?:\.\d+)?$/.test(input)) minutes = Number(input) * 60;
  else return undefined;
  minutes = Math.round(minutes);
  return minutes >= 1 && minutes <= 1440 ? minutes : undefined;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function entryAmountCents(entry: { minutes: number; hourly_rate_cents: number }): number {
  return Math.round((entry.minutes * entry.hourly_rate_cents) / 60);
}
