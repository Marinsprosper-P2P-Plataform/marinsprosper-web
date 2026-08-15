"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  BarChart3Icon,
  FileTextIcon,
  ListOrderedIcon,
  ShieldBanIcon,
  UsersIcon,
} from "lucide-react";
import { useMockAdminUsers } from "@/lib/mock/admin-users";
import { useMockOrders } from "@/lib/mock/orders";
import { ORDER_STATUS_META, type OrderStatusCategory } from "@/types/order";

/** GET /admin — home do painel administrativo, protótipo com dados
 * fake. Resumo numérico + atalhos pras outras telas do bucket
 * Administração & Mediação. Sem gate de role ainda — qualquer conta
 * pode navegar até aqui no protótipo (Sprint -1), mesma simplificação
 * já documentada pro resto do app; RBAC de verdade é backend. */
export default function AdminPage() {
  const { users } = useMockAdminUsers();
  const { orders } = useMockOrders();

  const pendingUsers = users.filter((user) => user.status === "pendente").length;
  const ordersByCategory = orders.reduce(
    (acc, order) => {
      const category = ORDER_STATUS_META[order.status].category;
      acc[category] = (acc[category] ?? 0) + 1;
      return acc;
    },
    {} as Record<OrderStatusCategory, number>,
  );
  const disputesOpen = ordersByCategory.dispute ?? 0;

  const cards = [
    { label: "Usuários cadastrados", value: users.length },
    { label: "Cadastros pendentes", value: pendingUsers },
    { label: "Ordens abertas", value: ordersByCategory.open ?? 0 },
    { label: "Ordens em andamento", value: ordersByCategory.progress ?? 0 },
    { label: "Ordens concluídas", value: ordersByCategory.completed ?? 0 },
    { label: "Ordens em disputa", value: disputesOpen },
  ];

  const links: { href: string; label: string; description: string; icon: ComponentType<{ className?: string }> }[] = [
    { href: "/admin/users", label: "Usuários", description: "Listar e aprovar cadastros", icon: UsersIcon },
    { href: "/admin/orders", label: "Ordens", description: "Visão consolidada de todas as ordens", icon: ListOrderedIcon },
    { href: "/admin/audit-logs", label: "Logs de auditoria", description: "Consulta somente leitura", icon: FileTextIcon },
    { href: "/admin/blacklist", label: "Blacklist", description: "Gestão de contas bloqueadas", icon: ShieldBanIcon },
    { href: "/disputes", label: "Disputas", description: "Fila de mediação (saiu do admin — papel é MEDIATOR)", icon: AlertTriangleIcon },
    { href: "/admin/reports", label: "Relatórios", description: "GMV, receita, lucro líquido e liquidez", icon: BarChart3Icon },
  ];

  return (
    <div className="flex flex-col gap-6 p-4">
      <div>
        <h1 className="text-xl font-semibold">Painel administrativo</h1>
        <p className="text-muted-foreground text-sm">Resumo da operação e atalhos pras telas de gestão</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="border-border rounded-lg border p-4">
            <p className="text-2xl font-semibold">{card.value}</p>
            <p className="text-muted-foreground text-xs">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Atalhos</h2>
        <ul className="flex flex-col gap-2">
          {links.map(({ href, label, description, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="border-border hover:bg-accent flex items-center gap-3 rounded-lg border p-3"
              >
                <Icon className="text-muted-foreground size-5 shrink-0" />
                <div className="flex flex-1 flex-col">
                  <span className="text-sm font-medium">{label}</span>
                  <span className="text-muted-foreground text-xs">{description}</span>
                </div>
                <ArrowRightIcon className="text-muted-foreground size-4 shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
