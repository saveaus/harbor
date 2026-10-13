import { Alert, Badge, Button, Card, Field, Input, Select, buttonClass } from "@/components/ui";
import { syncPayoutAccount } from "@/lib/checkout";
import { PAYOUT_COUNTRIES, parsePayoutCountry } from "@/lib/payout";
import { getStripe } from "@/lib/stripe";
import { getWorkspace } from "@/lib/workspace";
import { SettingsTitle } from "../settings-page";
import { connectPayoutAccount, continuePayoutOnboarding } from "./actions";

const COUNTRY_CODES = Object.keys(PAYOUT_COUNTRIES).flatMap((code) => parsePayoutCountry(code) ?? []);

export default async function PayoutAccountPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [{ error: notice }, { supabase, workspace }] = await Promise.all([searchParams, getWorkspace()]);
  const read = () => supabase.from("payout_accounts").select("*").eq("workspace_id", workspace.id).maybeSingle();

  let { data: account, error } = await read();
  if (error) throw error;
  if (account && !(account.charges_enabled && account.payouts_enabled)) {
    await syncPayoutAccount(account.stripe_account_id);
    ({ data: account, error } = await read());
    if (error) throw error;
  }

  return (
    <>
      <SettingsTitle title="Payout account" />
      {notice ? (
        <div className="mb-6">
          <Alert>{notice}</Alert>
        </div>
      ) : null}

      {account ? (
        <Card className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[14px] font-medium text-ink">
                Stripe account
                <Badge tone={account.charges_enabled && account.payouts_enabled ? "success" : "accent"}>
                  {account.charges_enabled && account.payouts_enabled ? "Active" : "Setup incomplete"}
                </Badge>
              </div>
              <p className="mt-1 text-[13px] text-ink-3">
                {PAYOUT_COUNTRIES[parsePayoutCountry(account.country) ?? "US"].name} · Clients are billed in {workspace.currency.toUpperCase()}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              {account.details_submitted ? (
                <a href="https://dashboard.stripe.com" target="_blank" rel="noreferrer" className={buttonClass("secondary")}>
                  Open Stripe dashboard
                </a>
              ) : null}
              {account.charges_enabled && account.payouts_enabled ? null : (
                <form action={continuePayoutOnboarding}>
                  <Button type="submit" variant="primary">
                    Continue setup
                  </Button>
                </form>
              )}
            </div>
          </div>
          <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-line pt-4 text-[13px]">
            {[
              ["Details submitted", account.details_submitted],
              ["Accepting payments", account.charges_enabled],
              ["Payouts to bank", account.payouts_enabled],
            ].map(([label, on]) => (
              <div key={String(label)}>
                <dt className="text-ink-3">{label}</dt>
                <dd className={on ? "text-success" : "text-ink"}>{on ? "Yes" : "Not yet"}</dd>
              </div>
            ))}
          </dl>
        </Card>
      ) : (
        <form action={connectPayoutAccount} className="space-y-5">
          <Field label="Registered Company Name">
            <Input name="legal_name" required maxLength={50} defaultValue={workspace.legal_name || workspace.name} />
          </Field>
          <Field label="Country" note="The currency of your bank account will be used for billing clients">
            <Select name="country" required defaultValue="">
              <option value="" disabled>
                Choose a country
              </option>
              {COUNTRY_CODES.map((code) => (
                <option key={code} value={code}>
                  {PAYOUT_COUNTRIES[code].name}
                </option>
              ))}
            </Select>
          </Field>
          {getStripe() ? (
            <Button type="submit" variant="primary">
              Connect bank
            </Button>
          ) : (
            <p className="text-[13px] text-ink-3">Payments aren&apos;t configured for this Harbor installation yet.</p>
          )}
        </form>
      )}
    </>
  );
}
