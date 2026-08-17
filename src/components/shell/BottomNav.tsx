"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Compass, Map, Route, Bookmark, User } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const NAV_ITEMS = [
  { href: "/discover", key: "discover", icon: Compass },
  { href: "/map", key: "map", icon: Map },
  { href: "/trip", key: "trip", icon: Route },
  { href: "/saved", key: "saved", icon: Bookmark },
  { href: "/profile", key: "profile", icon: User },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <nav aria-label="Primary" className="chrome-surface fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] pb-safe">
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-1">
        {NAV_ITEMS.map(({ href, key, icon: Icon }) => {
          const label = t(key);
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2.5 text-caption",
                  "transition-colors duration-fast ease-out",
                  active ? "text-accent-500" : "text-chrome-ink-muted"
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} aria-hidden="true" />
                <span className={cn(active && "font-medium")}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
