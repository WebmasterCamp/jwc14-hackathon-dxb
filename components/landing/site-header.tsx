import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LanguageToggle } from "@/components/language-toggle";
import { buttonVariants } from "@/components/ui/button";

export async function SiteHeader() {
  const t = await getTranslations();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="grid size-9 place-items-center rounded-lg bg-primary font-extrabold text-primary-foreground">
            R
          </span>
          <span className="text-xl font-extrabold tracking-tight">
            {t("common.appName")}
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageToggle />
          <Link
            href="/login"
            className={buttonVariants({ variant: "ghost", size: "sm", className: "hidden sm:inline-flex" })}
          >
            {t("nav.login")}
          </Link>
          <Link href="/register" className={buttonVariants({ size: "sm" })}>
            {t("nav.register")}
          </Link>
        </div>
      </div>
    </header>
  );
}
