import type { ComponentType } from "react";
import { AlertTriangle, BarChart3, ListOrdered, ShieldCheck, Store, User, Wallet } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

/** Itens de navegação principal do (dashboard) — mesma lista alimenta
 * a sidebar (desktop) e a bottom nav (mobile), pra nunca divergir. */
export const DASHBOARD_NAV_ITEMS: NavItem[] = [
  { href: "/offers", label: "Ofertas", icon: Store },
  { href: "/orders", label: "Ordens", icon: ListOrdered },
  { href: "/disputes", label: "Disputas", icon: AlertTriangle },
  { href: "/wallet", label: "Carteira", icon: Wallet },
  { href: "/reports", label: "Relatórios", icon: BarChart3 },
  { href: "/profile", label: "Perfil", icon: User },
  { href: "/admin", label: "Admin", icon: ShieldCheck },
];
