"use client";

import Link from "next/link";
import { OrderStatusBadge } from "@/components/shared/order-status-badge";
import { useMockDisputes } from "@/lib/mock/disputes";
import { useMockOrders } from "@/lib/mock/orders";
import { useMockSession } from "@/lib/mock/session";
import { formatBRL } from "@/lib/mock/format";

/**
 * GET /admin/disputes — protótipo com dados fake. Cobre o card
 * "Listagem de disputas para o mediador" — **restrita aos casos
 * atribuídos**: só mostra disputas onde `assignedMediatorId` bate com
 * a conta atualmente selecionada no `AccountSwitcher`. Trocar de conta
 * troca o que aparece aqui, na prática — é a mesma muleta de
 * prototipagem usada em todo o resto do app pra simular identidade sem
 * autenticação real.
 */
export default function AdminDisputesPage() {
  const { user } = useMockSession();
  const { orders } = useMockOrders();
  const { cases } = useMockDisputes();

  const myCases = cases.filter((item) => item.assignedMediatorId === user.id);
  const disputeOrders = myCases
    .map((item) => orders.find((order) => order.id === item.orderId))
    .filter((order) => order !== undefined);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h1 className="text-xl font-semibold">Disputas</h1>
        <p className="text-muted-foreground text-sm">Casos atribuídos a você como mediador</p>
      </div>

      {disputeOrders.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nenhuma disputa atribuída a você no momento.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {disputeOrders.map((order) => (
            <li
              key={order.id}
              className="border-border flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">{order.publicId}</span>
                  <OrderStatusBadge status={order.status} />
                </div>
                <p className="font-medium">
                  {order.clientName} × {order.cashierName ?? "—"} · {formatBRL(order.grossAmount)}
                </p>
                {order.disputeReason && (
                  <p className="text-muted-foreground text-sm">{order.disputeReason}</p>
                )}
              </div>
              <Link href={`/admin/disputes/${order.id}`} className="text-foreground text-sm underline">
                Analisar
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
