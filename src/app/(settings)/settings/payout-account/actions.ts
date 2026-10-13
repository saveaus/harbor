"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Stripe from "stripe";
import { text } from "@/lib/form-data";
import { PAYOUT_COUNTRIES, parsePayoutCountry } from "@/lib/payout";
import { appUrl, getStripe } from "@/lib/stripe";
import { requireAdmin } from "@/lib/workspace";

const PATH = "/settings/payout-account";

function fail(message: string): never {
  redirect(`${PATH}?error=${encodeURIComponent(message)}`);
}

async function onboardingUrl(accountId: string): Promise<string> {
  const stripe = getStripe();
  if (!stripe) fail("Stripe isn't configured for Harbor yet.");
  const link = await stripe.v2.core.accountLinks.create({
    account: accountId,
    use_case: {
      type: "account_onboarding",
      account_onboarding: { refresh_url: `${appUrl()}${PATH}`, return_url: `${appUrl()}${PATH}?return=1` },
    },
  });
  return link.url;
}

export async function connectPayoutAccount(form: FormData) {
  const { supabase, workspace, member } = await requireAdmin(PATH);
  const stripe = getStripe();
  if (!stripe) fail("Stripe isn't configured for Harbor yet.");
  const country = parsePayoutCountry(text(form, "country"));
  if (!country) fail("Choose the country your bank account is in.");
  const legalName = text(form, "legal_name").slice(0, 50);
  if (!legalName) fail("Enter your registered company name.");

  const { data: existing, error: lookupError } = await supabase
    .from("payout_accounts")
    .select("stripe_account_id")
    .eq("workspace_id", workspace.id)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (existing) redirect(await onboardingUrl(existing.stripe_account_id));

  const currency = PAYOUT_COUNTRIES[country].currency;
  let account: Stripe.V2.Core.Account;
  try {
    account = await stripe.v2.core.accounts.create({
      display_name: legalName,
      contact_email: member.email,
      dashboard: "full",
      identity: { country: country.toLowerCase() },
      defaults: { currency, responsibilities: { fees_collector: "stripe", losses_collector: "stripe" } },
      configuration: { merchant: { capabilities: { card_payments: { requested: true } } } },
      metadata: { workspace_id: workspace.id },
    });
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) fail(`Stripe couldn't create your payout account: ${error.message}`);
    throw error;
  }
  const { error } = await supabase
    .from("payout_accounts")
    .insert({ workspace_id: workspace.id, stripe_account_id: account.id, country });
  if (error) {
    await stripe.v2.core.accounts.close(account.id, { applied_configurations: ["merchant"] });
    throw error;
  }
  const { error: workspaceError } = await supabase
    .from("workspaces")
    .update({ legal_name: legalName, currency })
    .eq("id", workspace.id);
  if (workspaceError) throw workspaceError;
  revalidatePath("/", "layout");
  redirect(await onboardingUrl(account.id));
}

export async function continuePayoutOnboarding() {
  const { supabase, workspace } = await requireAdmin(PATH);
  const { data, error } = await supabase.from("payout_accounts").select("stripe_account_id").eq("workspace_id", workspace.id).maybeSingle();
  if (error) throw error;
  if (!data) redirect(PATH);
  redirect(await onboardingUrl(data.stripe_account_id));
}
