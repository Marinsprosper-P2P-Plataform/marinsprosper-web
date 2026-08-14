import { ThemeToggle } from "@/components/shared/theme-toggle";
import { AccountSwitcher } from "@/components/shared/account-switcher";
import { LogoutButton } from "@/components/shared/logout-button";

/** Equivalente mobile do rodapé da Sidebar — só visível abaixo de `md`,
 * já que a Sidebar (com o mesmo AccountSwitcher/ThemeToggle) fica
 * escondida nessas telas. */
export function MobileHeader() {
  return (
    <header className="border-border bg-background flex items-center justify-between gap-3 border-b p-3 md:hidden">
      <span className="text-lg font-semibold">Marinsprosper</span>
      <div className="flex items-center gap-2">
        <div className="w-40">
          <AccountSwitcher />
        </div>
        <ThemeToggle />
        <LogoutButton />
      </div>
    </header>
  );
}
