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
