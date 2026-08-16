"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ComponentType } from "react";
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  BarChart3Icon,
  FileTextIcon,
  IdCardIcon,
  ListOrderedIcon,
  ShieldBanIcon,
  StarIcon,
  UsersIcon,
} from "lucide-react";
import { listAdminOrdersRequest, listAdminUsersRequest } from "@/lib/admin/api";
import { listKycQueueRequest } from "@/lib/kyc/admin-api";
import { ApiError, ApiNetworkError } from "@/lib/api";

/**
 * `GET /admin` — protótipo sem endpoint próprio de resumo; monta os
 * contadores a partir das listagens reais (`/admin/users`,
 * `/admin/orders`, `/admin/kyc`), cada uma com teto de 100 no
 * backend — "contadores" aqui são "quantas apareceram na página",
 * não o total exato enquanto o volume crescer além disso. Sem gate de
 * role no front ainda (mesma simplificação documentada pro resto do
 * app); o backend responde 403 pra quem não é `ADMIN` em cada rota.
 */
export default function AdminPage() {
  const [counts, setCounts] = useState<{
    pendingUsers: number;
    kycQueue: number;
    openOrders: number;
    disputedOrders: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [pendingUsers, kycQueue, openOrders, disputedOrders] = await Promise.all([
          listAdminUsersRequest({ status: "PENDING_KYC", take: 100 }),
          listKycQueueRequest({ take: 100 }),
          listAdminOrdersRequest({ status: "OPEN", take: 100 }),
          listAdminOrdersRequest({ status: "DISPUTED", take: 100 }),
        ]);
        if (cancelled) return;
        setCounts({
          pendingUsers: pendingUsers.data.length,
          kycQueue: kycQueue.data.length,
          openOrders: openOrders.data.length,
          disputedOrders: disputedOrders.data.length,
        });
        setError(null);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiNetworkError) setError(err.message);
        else if (err instanceof ApiError && err.status === 403) {
          setError("Acesso restrito à administração — sua conta não tem o papel ADMIN.");
        } else if (err instanceof ApiError) setError(`Backend recusou a consulta: ${err.message}`);
        else setError("Não foi possível carregar os contadores.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const cards = [
    { label: "Cadastros pendentes", value: counts?.pendingUsers },
    { label: "Casos de KYC na fila", value: counts?.kycQueue },
    { label: "Ordens abertas", value: counts?.openOrders },
    { label: "Ordens em disputa", value: counts?.disputedOrders },
  ];

  const links: { href: string; label: string; description: string; icon: ComponentType<{ className?: string }> }[] = [
    { href: "/admin/users", label: "Usuários", description: "Listar e aprovar cadastros", icon: UsersIcon },
    { href: "/admin/kyc", label: "Fila de KYC", description: "Análise de documentos submetidos", icon: IdCardIcon },
    { href: "/admin/orders", label: "Ordens", description: "Visão consolidada de todas as ordens", icon: ListOrderedIcon },
    { href: "/admin/audit-logs", label: "Logs de auditoria", description: "Consulta somente leitura", icon: FileTextIcon },
    { href: "/admin/blacklist", label: "Blacklist", description: "Gestão de bloqueios", icon: ShieldBanIcon },
    { href: "/admin/ratings", label: "Avaliações", description: "Esconder ou reexibir avaliação, com motivo", icon: StarIcon },
    { href: "/disputes", label: "Disputas", description: "Fila de mediação (papel MEDIATOR, não ADMIN)", icon: AlertTriangleIcon },
    { href: "/admin/reports", label: "Relatórios", description: "GMV, receita e liquidez (ledger sem rota HTTP, ainda mockado)", icon: BarChart3Icon },
  ];

  return (
    <div className="flex flex-col gap-6 p-4">
      <div>
        <h1 className="text-xl font-semibold">Painel administrativo</h1>
        <p className="text-muted-foreground text-sm">Resumo da operação e atalhos pras telas de gestão</p>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="border-border rounded-lg border p-4">
            <p className="text-2xl font-semibold">{card.value ?? "…"}</p>
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
