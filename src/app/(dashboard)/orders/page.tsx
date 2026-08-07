"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge } from "@/components/shared/order-status-badge";
import { useMockOrders } from "@/lib/mock/orders";
import { useMockSession } from "@/lib/mock/session";
import { formatBRL } from "@/lib/mock/format";

/** GET /orders — a mesma rota muda o que mostra de acordo com o papel
 * de quem está vendo: cliente vê as que criou, caixeiro vê as que
 * aceitou (checagem de participante — order_participants no modelo real). */
export default function OrdersPage() {
  const { orders } = useMockOrders();
  const { user } = useMockSession();

  const myOrders = orders.filter((order) =>
    user.role === "cliente" ? order.clientId === user.id : order.cashierId === user.id,
  );

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Minhas ordens</h1>
          <p className="text-muted-foreground text-sm">
            {user.role === "cliente" ? "Ordens que você criou" : "Ordens que você aceitou"}
          </p>
        </div>
        {user.role === "cliente" && (
          <Button asChild size="sm">
            <Link href="/orders/new">Nova ordem</Link>
          </Button>
        )}
      </div>

      {myOrders.length === 0 && (
        <p className="text-muted-foreground text-sm">
          {user.role === "cliente"
            ? "Você ainda não criou nenhuma ordem."
            : "Você ainda não aceitou nenhuma ordem — veja as ofertas disponíveis."}
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {myOrders.map((order) => (
          <li key={order.id}>
            <Link
              href={`/orders/${order.id}`}
              className="border-border hover:bg-accent flex flex-col gap-2 rounded-lg border p-4 transition-colors sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs">{order.publicId}</span>
                <p className="font-medium">
                  {order.type === "compra" ? "Compra" : "Venda"} — {formatBRL(order.grossAmount)}
                </p>
              </div>
              <OrderStatusBadge status={order.status} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
