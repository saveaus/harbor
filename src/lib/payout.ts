/** Countries Harbor can onboard for payouts, with the (two-decimal) currency clients are billed in. */
export const PAYOUT_COUNTRIES = {
  AU: { name: "Australia", currency: "aud" },
  CA: { name: "Canada", currency: "cad" },
  DE: { name: "Germany", currency: "eur" },
  ES: { name: "Spain", currency: "eur" },
  FR: { name: "France", currency: "eur" },
  GB: { name: "United Kingdom", currency: "gbp" },
  IE: { name: "Ireland", currency: "eur" },
  IT: { name: "Italy", currency: "eur" },
  NL: { name: "Netherlands", currency: "eur" },
  NZ: { name: "New Zealand", currency: "nzd" },
  SG: { name: "Singapore", currency: "sgd" },
  US: { name: "United States", currency: "usd" },
} as const;

export type PayoutCountry = keyof typeof PAYOUT_COUNTRIES;

export function parsePayoutCountry(value: string): PayoutCountry | undefined {
  return Object.keys(PAYOUT_COUNTRIES).find((code): code is PayoutCountry => code === value);
}
