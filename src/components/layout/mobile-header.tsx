import { ThemeToggle } from "@/components/shared/theme-toggle";
import { RoleSwitcher } from "@/components/shared/role-switcher";

/** Equivalente mobile do rodapé da Sidebar — só visível abaixo de `md`,
 * já que a Sidebar (com o mesmo RoleSwitcher/ThemeToggle) fica escondida
 * nessas telas. */
export function MobileHeader() {
  return (
    <header className="border-border bg-background flex items-center justify-between gap-3 border-b p-3 md:hidden">
      <span className="text-lg font-semibold">Marinsprosper</span>
      <div className="flex items-center gap-2">
        <div className="w-40">
          <RoleSwitcher />
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
