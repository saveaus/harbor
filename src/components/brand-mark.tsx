import { clsx } from "clsx";

const sizes = {
  sm: "size-5 rounded-[5px] text-[11px]",
  md: "size-7 rounded-[7px] text-[13px]",
  lg: "size-10 rounded-[9px] text-[17px]",
} as const;

export function BrandMark({
  name,
  color,
  logoUrl,
  size = "sm",
}: {
  name: string;
  color: string;
  logoUrl: string | null;
  size?: keyof typeof sizes;
}) {
  if (logoUrl)
    // eslint-disable-next-line @next/next/no-img-element -- user-uploaded logo served from Supabase Storage
    return <img src={logoUrl} alt={name} className={clsx(sizes[size], "shrink-0 border border-line bg-canvas object-contain")} />;
  return (
    <span
      className={clsx(sizes[size], "flex shrink-0 items-center justify-center font-bold text-white")}
      style={{ backgroundColor: color }}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
