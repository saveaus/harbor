import Link from "next/link";
import { Suspense } from "react";
import { signIn, signUp } from "@/app/auth-actions";
import { Field, Input, buttonClass } from "@/components/ui";

type LoginParams = Promise<{ mode?: string; error?: string; notice?: string }>;

export default function LoginPage({ searchParams }: { searchParams: LoginParams }) {
  return (
    <main className="flex min-h-full items-center justify-center bg-surface px-4">
      <Suspense>
        <LoginCard searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function LoginCard({ searchParams }: { searchParams: LoginParams }) {
  const { mode, error, notice } = await searchParams;
  const signingUp = mode === "signup";

  return (
    <div className="w-full max-w-[380px]">
      <div>
        <div className="mb-6 flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-[7px] bg-ink text-[13px] font-bold text-white">H</span>
          <span className="text-[15px] font-semibold">Harbor</span>
        </div>
        <div className="rounded-card border border-line bg-canvas p-6 shadow-control">
          <h1 className="text-[18px] font-semibold">{signingUp ? "Create your account" : "Sign in"}</h1>
          <p className="mt-1 text-[13px] text-ink-3">
            {signingUp ? "Set up a portal for your clients in a few minutes." : "Welcome back to your client portal."}
          </p>

          {error ? <p className="mt-4 rounded-control bg-danger-soft px-3 py-2 text-[13px] text-danger">{error}</p> : null}
          {notice ? <p className="mt-4 rounded-control bg-info-soft px-3 py-2 text-[13px] text-link">{notice}</p> : null}

          <form action={signingUp ? signUp : signIn} className="mt-5 space-y-4">
            <Field label="Work email">
              <Input name="email" type="email" required autoComplete="email" placeholder="you@company.com" />
            </Field>
            <Field label="Password" hint={signingUp ? "At least 8 characters." : undefined}>
              <Input
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete={signingUp ? "new-password" : "current-password"}
              />
            </Field>
            <button type="submit" className={buttonClass("primary", "w-full")}>
              {signingUp ? "Create account" : "Sign in"}
            </button>
          </form>
        </div>
        <p className="mt-4 text-center text-[13px] text-ink-3">
          {signingUp ? "Already have an account? " : "New to Harbor? "}
          <Link href={signingUp ? "/login" : "/login?mode=signup"} className="font-medium text-link hover:underline">
            {signingUp ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </div>
    </div>
  );
}
