import { cn } from "@/lib/utils";

/**
 * Brand-name text fallback used in place of real logo images. Styled as a
 * neutral "logo chip"; `logo-multiply` blends out white boxes in light mode
 * (and is disabled in dark mode via globals.css).
 */
export function SponsorLogo({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    sm: "h-12 px-4 text-sm",
    md: "h-16 px-6 text-base",
    lg: "h-24 px-10 text-2xl",
  } as const;

  return (
    <div
      className={cn(
        "logo-multiply flex shrink-0 items-center justify-center rounded-xl border bg-card font-semibold tracking-tight text-foreground/80",
        sizes[size],
        className
      )}
    >
      {name}
    </div>
  );
}
