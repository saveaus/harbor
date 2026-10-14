export function text(form: FormData, name: string): string {
  const value = form.get(name);
  // Browsers submit textarea line breaks as CRLF.
  return typeof value === "string" ? value.replaceAll("\r\n", "\n").trim() : "";
}

export function optionalId(form: FormData, name: string): string | null {
  const value = text(form, name);
  return value === "" ? null : value;
}

export function cents(form: FormData, name: string): number {
  const value = Number.parseFloat(text(form, name));
  if (!Number.isFinite(value) || value < 0) throw new Error(`Invalid amount for ${name}`);
  return Math.round(value * 100);
}

export function checked(form: FormData, name: string): boolean {
  const value = form.get(name);
  return value === "on" || value === "true" || value === "1";
}

/** Dollars to cents, or a reason the amount can't be stored. */
export function money(form: FormData, name: string): { value: number } | { error: string } {
  const raw = text(form, name);
  if (!raw) return { error: "Enter an amount." };
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value) || value < 0 || value > 1_000_000_000) return { error: "Enter a valid amount." };
  return { value: Math.round(value * 100) };
}
