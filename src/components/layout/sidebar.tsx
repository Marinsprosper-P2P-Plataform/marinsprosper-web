"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { AccountSwitcher } from "@/components/shared/account-switcher";
import { DASHBOARD_NAV_ITEMS } from "./nav-items";

/** Sidebar — só aparece a partir de `md` (tablet/desktop); em telas
 * menores a navegação vive na BottomNav. */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="border-border hidden w-56 shrink-0 flex-col border-r md:flex">
      <div className="px-4 py-5">
        <span className="text-lg font-semibold">Marinsprosper</span>
      </div>

      <nav className="flex-1 px-2">
        <ul className="flex flex-col gap-1">
          {DASHBOARD_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive =
              pathname === href || pathname.startsWith(`${href}/`);

            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className="size-4" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-border flex flex-col gap-3 border-t px-4 py-3">
        <AccountSwitcher />
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs">Tema</span>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
