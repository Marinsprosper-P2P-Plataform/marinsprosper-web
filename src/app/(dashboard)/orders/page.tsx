"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge } from "@/components/shared/order-status-badge";
import { useMockOrders } from "@/lib/mock/orders";
import { useMockSession } from "@/lib/mock/session";
import { formatBRL } from "@/lib/mock/format";

/** GET /orders — mostra as ordens onde a conta é participante em
 * QUALQUER capacidade: como cliente (criou) e/ou como caixeiro
 * (aceitou), já que as duas não são mutuamente exclusivas. Cada linha
 * indica em que papel a ordem se aplica. */
export default function OrdersPage() {
  const { orders } = useMockOrders();
  const { user } = useMockSession();

  const myOrders = orders.filter(
    (order) => order.clientId === user.id || order.cashierId === user.id,
  );

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Minhas ordens</h1>
          <p className="text-muted-foreground text-sm">
            Ordens que você criou ou aceitou
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/orders/new">Nova ordem</Link>
        </Button>
      </div>

      {myOrders.length === 0 && (
        <p className="text-muted-foreground text-sm">
          Você ainda não tem ordens.{" "}
          {user.isCashier && "Veja as ofertas disponíveis ou "}
          crie uma nova.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {myOrders.map((order) => {
          const asClient = order.clientId === user.id;

          return (
            <li key={order.id}>
              <Link
                href={`/orders/${order.id}`}
                className="border-border hover:bg-accent flex flex-col gap-2 rounded-lg border p-4 transition-colors sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">{order.publicId}</span>
                    <Badge variant="outline" className="text-[0.65rem]">
                      {asClient ? "Como cliente" : "Como caixeiro"}
                    </Badge>
                  </div>
                  <p className="font-medium">
                    {order.type === "compra" ? "Compra" : "Venda"} — {formatBRL(order.grossAmount)}
                  </p>
                </div>
                <OrderStatusBadge status={order.status} />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
