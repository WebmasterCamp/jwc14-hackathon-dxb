"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { SponsorLogo } from "./sponsor-logo";
import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils";

/**
 * Infinite auto-scrolling logo carousel driven by CSS animation.
 *
 * - The track holds the items twice so a -50% translate loops seamlessly.
 * - Left/right arrow buttons flip the scroll direction.
 * - Pauses on hover/focus (globals.css) and respects prefers-reduced-motion.
 */
export function Marquee({
  items,
  durationSeconds = 30,
}: {
  items: string[];
  durationSeconds?: number;
}) {
  const t = useTranslations("common");
  const [direction, setDirection] = useState<"left" | "right">("left");

  const doubled = [...items, ...items];

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setDirection("right")}
        aria-label={t("prevSlide")}
        aria-pressed={direction === "right"}
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-full border bg-card transition-colors hover:bg-accent",
          direction === "right" && "border-primary text-primary"
        )}
      >
        <Icons.back className="size-5" aria-hidden />
      </button>

      <div className="relative flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
        <div
          className={cn(
            "marquee-track flex w-max gap-4",
            direction === "left" ? "animate-marquee-left" : "animate-marquee-right"
          )}
          style={{ ["--marquee-duration" as string]: `${durationSeconds}s` }}
        >
          {doubled.map((name, i) => (
            <SponsorLogo key={`${name}-${i}`} name={name} size="md" />
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setDirection("left")}
        aria-label={t("nextSlide")}
        aria-pressed={direction === "left"}
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-full border bg-card transition-colors hover:bg-accent",
          direction === "left" && "border-primary text-primary"
        )}
      >
        <Icons.next className="size-5" aria-hidden />
      </button>
    </div>
  );
}
