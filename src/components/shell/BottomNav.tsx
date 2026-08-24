"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
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
      <ul className="relative mx-auto flex max-w-md items-stretch justify-between px-1">
        {NAV_ITEMS.map(({ href, key, icon: Icon }) => {
          const label = t(key);
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="relative flex-1">
              {active && (
                <motion.span
                  layoutId="bottom-nav-active"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  className="absolute inset-x-2 top-0.5 h-0.5 rounded-full bg-accent-500"
                  aria-hidden="true"
                />
              )}
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2.5 text-caption",
                  "transition-colors duration-fast ease-out",
                  active ? "text-accent-500" : "text-chrome-ink-muted"
                )}
              >
                <motion.span
                  animate={active ? { scale: [1, 1.22, 1] } : { scale: 1 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="flex"
                >
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} aria-hidden="true" />
                </motion.span>
                <span className={cn(active && "font-medium")}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
