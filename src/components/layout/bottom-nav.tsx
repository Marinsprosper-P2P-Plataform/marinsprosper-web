"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { DASHBOARD_NAV_ITEMS } from "./nav-items";

/** Navegação inferior — mobile-first: visível por padrão, escondida
 * a partir de `md` (onde a Sidebar assume). Fixa, respeitando a
 * safe-area do home indicator via padding-bottom. */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="bg-background border-border fixed inset-x-0 bottom-0 z-40 border-t md:hidden"
      style={{ paddingBottom: "var(--spacing-safe-bottom)" }}
    >
      <ul className="flex items-stretch justify-around">
        {DASHBOARD_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);

          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 text-xs",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className="size-5" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
