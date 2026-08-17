"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MapPin,
  Video,
  Inbox,
  Star,
  Car,
  Route,
  Users,
  BedDouble,
  CircleDollarSign,
  Bot,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/places", label: "Places", icon: MapPin },
  { href: "/admin/videos", label: "Videos", icon: Video },
  { href: "/admin/submissions", label: "Submissions", icon: Inbox },
  { href: "/admin/creators", label: "Creators", icon: Star },
  { href: "/admin/drivers", label: "Drivers", icon: Car },
  { href: "/admin/trips", label: "Trips", icon: Route },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/hotels", label: "Hotels & Activities", icon: BedDouble },
  { href: "/admin/pricing", label: "Pricing", icon: CircleDollarSign },
  { href: "/admin/ai-activity", label: "AI Activity", icon: Bot },
  { href: "/admin/settings", label: "Settings", icon: Settings },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin sections" className="border-b border-border">
      <ul className="no-scrollbar flex gap-1 overflow-x-auto px-4 py-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`));
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-body-sm transition-colors duration-fast ease-out",
                  active ? "bg-accent-500 text-ink-onaccent" : "text-ink-700 hover:bg-surface-2"
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
