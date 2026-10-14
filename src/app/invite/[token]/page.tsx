import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { BrandMark } from "@/components/brand-mark";
import { Field, Input, buttonClass } from "@/components/ui";
import { brandAssetUrl } from "@/lib/brand";
import { getInvitePreview, type InvitePreview } from "@/lib/invites";
import { createClient } from "@/lib/supabase/server";
import { acceptInvite, createAccountAndAccept, emailSignInLink, signInAndAccept, signOutForInvite } from "../actions";

type InviteProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ mode?: string; error?: string; sent?: string }>;
};

const stateMessages: Record<Exclude<InvitePreview["state"], "valid">, string> = {
  accepted: "This invite has already been used. Sign in to continue.",
  revoked: "This invite was cancelled. Ask whoever sent it for a new link.",
  expired: "This invite has expired. Ask whoever sent it for a new link.",
};

export default function InvitePage(props: InviteProps) {
  return (
    <main className="flex min-h-full items-center justify-center bg-surface px-4">
      <Suspense>
        <InviteCard {...props} />
      </Suspense>
    </main>
  );
}

async function InviteCard({ params, searchParams }: InviteProps) {
  const [{ token }, { mode, error, sent }] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const [invite, { data: auth }] = await Promise.all([getInvitePreview(supabase, token), supabase.auth.getUser()]);

  if (!invite)
    return (
      <Shell title="Invite not found" error={null}>
        <p className="text-[13px] text-ink-3">Check that you copied the whole link, or ask for a new one.</p>
      </Shell>
    );

  const brand = <BrandMark name={invite.workspaceName} color={invite.brandColor} logoUrl={brandAssetUrl(invite.logoPath)} size="md" />;
  const audience = invite.kind === "client" ? "client portal" : "staff workspace";
  const title = `Join the ${invite.workspaceName} ${audience}`;

  if (invite.state !== "valid")
    return (
      <Shell brand={brand} title={title} error={null}>
        <p className="text-[13px] text-ink-3">{stateMessages[invite.state]}</p>
        <Link href="/login" className={buttonClass("secondary", "mt-5 w-full")}>
          Go to sign in
        </Link>
      </Shell>
    );

  const user = auth.user;
  if (user && user.email?.toLowerCase() === invite.email.toLowerCase())
    return (
      <Shell brand={brand} title={title} error={error}>
        <p className="text-[13px] text-ink-3">You&apos;re signed in as {invite.email}.</p>
        <form action={acceptInvite.bind(null, token)} className="mt-5">
          <button type="submit" className={buttonClass("primary", "w-full")}>
            Accept invite
          </button>
        </form>
      </Shell>
    );

  if (user)
    return (
      <Shell brand={brand} title={title} error={error}>
        <p className="text-[13px] text-ink-3">
          This invite is for {invite.email}, but you&apos;re signed in as {user.email}. Sign out to continue.
        </p>
        <form action={signOutForInvite.bind(null, token)} className="mt-5">
          <button type="submit" className={buttonClass("primary", "w-full")}>
            Sign out
          </button>
        </form>
      </Shell>
    );

  if (sent)
    return (
      <Shell brand={brand} title="Check your inbox" error={error}>
        <p className="text-[13px] text-ink-3">
          We sent a sign-in link to {invite.email}. Open it on this device to join {invite.workspaceName}.
        </p>
      </Shell>
    );

  const signingIn = mode === "signin";
  return (
    <Shell brand={brand} title={title} error={error}>
      <p className="text-[13px] text-ink-3">
        {signingIn ? "Sign in to accept the invite." : "Choose a password to finish setting up your account."}
      </p>
      <form action={(signingIn ? signInAndAccept : createAccountAndAccept).bind(null, token)} className="mt-5 space-y-4">
        <Field label="Email">
          <Input value={invite.email} readOnly disabled />
        </Field>
        <Field label="Password" hint={signingIn ? undefined : "At least 8 characters."}>
          <Input
            name="password"
            type="password"
            required
            minLength={8}
            maxLength={72}
            autoComplete={signingIn ? "current-password" : "new-password"}
          />
        </Field>
        <button type="submit" className={buttonClass("primary", "w-full")}>
          {signingIn ? "Sign in and accept" : "Create account"}
        </button>
      </form>
      {invite.linkSignIn ? (
        <form action={emailSignInLink.bind(null, token)} className="mt-3">
          <button type="submit" className={buttonClass("secondary", "w-full")}>
            Email me a sign-in link instead
          </button>
        </form>
      ) : null}
      <p className="mt-4 text-center text-[13px] text-ink-3">
        {signingIn ? "New here? " : "Already have an account? "}
        <Link
          href={signingIn ? `/invite/${encodeURIComponent(token)}` : `/invite/${encodeURIComponent(token)}?mode=signin`}
          className="font-medium text-link hover:underline"
        >
          {signingIn ? "Create an account" : "Sign in"}
        </Link>
      </p>
    </Shell>
  );
}

function Shell({ brand, title, error, children }: { brand?: ReactNode; title: string; error: string | null | undefined; children: ReactNode }) {
  return (
    <div className="w-full max-w-[400px]">
      <div className="rounded-card border border-line bg-canvas p-6 shadow-control">
        {brand ? <div className="mb-4">{brand}</div> : null}
        <h1 className="text-[18px] font-semibold">{title}</h1>
        {error ? <p className="mt-3 rounded-control bg-danger-soft px-3 py-2 text-[13px] text-danger">{error}</p> : null}
        <div className="mt-2">{children}</div>
      </div>
      <p className="mt-4 text-center text-[12px] text-ink-4">Powered by Harbor</p>
    </div>
  );
}
