"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icons, type LucideIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

type Tab = { href: string; key: "home" | "history" | "profile"; Icon: LucideIcon };

const TABS: Tab[] = [
  { href: "/app", key: "home", Icon: Icons.camera },
  { href: "/app/history", key: "history", Icon: Icons.history },
  { href: "/app/profile", key: "profile", Icon: Icons.profile },
];

export function AppNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <nav className="flex justify-center" aria-label="Primary">
      <div className="inline-flex items-center gap-1 rounded-full border bg-card p-1">
        {TABS.map(({ href, key, Icon }) => {
          const active = href === "/app" ? pathname === "/app" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="size-4" aria-hidden />
              {t(key)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
