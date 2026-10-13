import type { ReactNode } from "react";
import { BrandMark } from "./brand-mark";
import { brandAssetUrl } from "@/lib/brand";

/** Frame for pages anyone can open without signing in: payment links and stores. */
export function PublicShell({
  name,
  color,
  logoPath,
  children,
}: {
  name: string;
  color: string;
  logoPath: string | null;
  children: ReactNode;
}) {
  return (
    <div className="min-h-full bg-surface">
      <header className="flex h-[61px] items-center gap-2.5 border-b border-line bg-canvas px-6">
        <BrandMark name={name} color={color} logoUrl={brandAssetUrl(logoPath)} size="md" />
        <span className="text-[14px] font-medium text-ink">{name}</span>
      </header>
      <div className="mx-auto w-full max-w-[880px] px-6 py-12">{children}</div>
      <footer className="pb-10 text-center text-[12px] text-ink-4">Payments are processed securely by Stripe.</footer>
    </div>
  );
}
