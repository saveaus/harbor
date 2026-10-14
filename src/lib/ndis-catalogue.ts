import bundled from "@/lib/ndis-catalogue.json";
import { SUPPORT_NUMBER, type BillingUnit } from "@/lib/finance";

export type CatalogueItem = {
  support_number: string;
  name: string;
  unit: BillingUnit;
  rate_cents: number;
};

const UNITS: Record<string, BillingUnit> = {
  H: "hour",
  HR: "hour",
  HOUR: "hour",
  HOURS: "hour",
  E: "each",
  EA: "each",
  EACH: "each",
  D: "each",
  WK: "each",
  WEEK: "each",
  MON: "each",
  MONTH: "each",
  YR: "each",
  YEAR: "each",
  KM: "km",
  K: "km",
};

const PRICE_KEYS = ["NSW", "ACT", "National", "VIC", "QLD", "SA", "TAS", "WA", "NT"];

function decodeCatalogue(bytes: Uint8Array): string {
  const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  if (utf8.includes("\uFFFD") || utf8.includes("\u0000")) return new TextDecoder("windows-1252").decode(bytes);
  return utf8.replace(/\u0000/g, "");
}

function cells(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (ch === delimiter && !quoted) {
      out.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  out.push(current.trim());
  return out;
}

function dollarsToCents(raw: string): number | null {
  const cleaned = raw.replace(/[$,]/g, "").trim();
  if (!cleaned) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100);
}

/** Official NDIS support catalogue (semicolon) or a simple CSV with the same columns. */
export function parsePriceGuide(csv: string): CatalogueItem[] {
  const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const delimiter = (lines[0].match(/;/g)?.length ?? 0) >= (lines[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const header = cells(lines[0], delimiter).map((h) => h.trim());
  const numberAt = header.findIndex((h) => /support item number/i.test(h));
  const nameAt = header.findIndex((h) => /support item name/i.test(h));
  const unitAt = header.findIndex((h) => /^unit$/i.test(h));
  const priceAt = PRICE_KEYS.map((key) => header.findIndex((h) => h.trim().toUpperCase() === key || h.trim().toUpperCase() === `${key}`)).find(
    (i) => i >= 0,
  );
  if (numberAt < 0 || nameAt < 0 || unitAt < 0 || priceAt === undefined) return [];

  const byNumber = new Map<string, CatalogueItem>();
  for (const line of lines.slice(1)) {
    const row = cells(line, delimiter);
    const support_number = (row[numberAt] ?? "").trim().toUpperCase();
    const name = (row[nameAt] ?? "").trim().slice(0, 160);
    const unit = UNITS[(row[unitAt] ?? "").trim().toUpperCase()];
    const rate_cents = dollarsToCents(row[priceAt] ?? "");
    if (!SUPPORT_NUMBER.test(support_number) || !support_number || !name || !unit || rate_cents === null) continue;
    byNumber.set(support_number.slice(0, 50), { support_number: support_number.slice(0, 50), name, unit, rate_cents });
  }
  return [...byNumber.values()];
}

export function bundledPriceGuide(): CatalogueItem[] {
  return bundled.filter((item): item is CatalogueItem => {
    return (
      SUPPORT_NUMBER.test(item.support_number) &&
      item.support_number !== "" &&
      item.name.length > 0 &&
      (item.unit === "hour" || item.unit === "each" || item.unit === "km") &&
      item.rate_cents > 0
    );
  });
}

export async function catalogueFromUpload(file: File): Promise<CatalogueItem[]> {
  const items = parsePriceGuide(decodeCatalogue(new Uint8Array(await file.arrayBuffer())));
  if (items.length === 0) throw new Error("That file isn't an NDIS support catalogue. Use the official CSV with support number, name, unit and NSW rates.");
  return items;
}
