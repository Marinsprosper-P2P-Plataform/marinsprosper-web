"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { OfferList } from "@/components/shared/offer-list";
import { OrderStatusBadge, OrderTypeBadge } from "@/components/shared/order-status-badge";
import { useMockOrders } from "@/lib/mock/orders";
import { useMockSession } from "@/lib/mock/session";
import { formatBRL } from "@/lib/mock/format";
import { ORDER_STATUS_META, type Order, type OrderStatusCategory } from "@/types/order";

type OrdersSubTab = "disponivel" | "execucao" | "finalizadas";

const EXECUCAO_CATEGORIES: OrderStatusCategory[] = ["open", "progress", "dispute"];
const FINALIZADAS_CATEGORIES: OrderStatusCategory[] = ["completed", "cancelled", "expired"];

/** GET /orders — 3 tiles no topo (Disponível / Em execução / Finalizadas)
 * em vez de uma lista única. "Disponível" é a mesma listagem pública de
 * `/offers` renderizada inline (ver `OfferList`), não uma navegação —
 * evita o usuário ter que sair de "Minhas ordens" só pra aceitar uma
 * oferta nova. "Em execução"/"Finalizadas" continuam restritas às
 * ordens onde a conta é participante (cliente e/ou caixeiro). */
export default function OrdersPage() {
  const { orders } = useMockOrders();
  const { user } = useMockSession();
  const [subTab, setSubTab] = useState<OrdersSubTab>("disponivel");

  const openOrders = useMemo(() => orders.filter((order) => order.status === "OPEN"), [orders]);

  const myOrders = useMemo(
    () => orders.filter((order) => order.clientId === user.id || order.cashierId === user.id),
    [orders, user.id],
  );

  const execucaoOrders = useMemo(
    () => myOrders.filter((order) => EXECUCAO_CATEGORIES.includes(ORDER_STATUS_META[order.status].category)),
    [myOrders],
  );
  const finalizadasOrders = useMemo(
    () => myOrders.filter((order) => FINALIZADAS_CATEGORIES.includes(ORDER_STATUS_META[order.status].category)),
    [myOrders],
  );

  const isDisponivel = subTab === "disponivel";
  const isExecucao = subTab === "execucao";
  const isFinalizadas = subTab === "finalizadas";

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

      <div className="grid grid-cols-3 gap-3">
        <OrdersTile
          label="Disponível"
          count={openOrders.length}
          active={isDisponivel}
          onClick={() => setSubTab("disponivel")}
        />
        <OrdersTile
          label="Em execução"
          count={execucaoOrders.length}
          active={isExecucao}
          onClick={() => setSubTab("execucao")}
        />
        <OrdersTile
          label="Finalizadas"
          count={finalizadasOrders.length}
          active={isFinalizadas}
          onClick={() => setSubTab("finalizadas")}
        />
      </div>

      {isDisponivel && <OfferList orders={openOrders} />}
      {isExecucao && <MyOrdersList orders={execucaoOrders} userId={user.id} emptyLabel="Nenhuma ordem em execução." />}
      {isFinalizadas && (
        <MyOrdersList orders={finalizadasOrders} userId={user.id} emptyLabel="Nenhuma ordem finalizada ainda." />
      )}
    </div>
  );
}

function OrdersTile({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "border-border flex flex-col items-center gap-1 rounded-lg border p-3 text-center transition-colors",
        active ? "bg-accent border-foreground/20" : "hover:bg-accent/50",
      )}
    >
      <span className="text-2xl font-semibold">{count}</span>
      <span className="text-muted-foreground text-xs">{label}</span>
    </button>
  );
}

function MyOrdersList({
  orders,
  userId,
  emptyLabel,
}: {
  orders: Order[];
  userId: string;
  emptyLabel: string;
}) {
  if (orders.length === 0) {
    return <p className="text-muted-foreground text-sm">{emptyLabel}</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {orders.map((order) => {
        const asClient = order.clientId === userId;

        return (
          <li key={order.id}>
            <Link
              href={`/orders/${order.id}`}
              className="border-border hover:bg-accent flex flex-col gap-2 rounded-lg border p-4 transition-colors sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <OrderTypeBadge type={order.type} />
                  <span className="text-muted-foreground text-xs">{order.publicId}</span>
                  <Badge variant="outline" className="text-[0.65rem]">
                    {asClient ? "Como cliente" : "Como caixeiro"}
                  </Badge>
                </div>
                <p className="font-medium">{formatBRL(order.grossAmount)}</p>
              </div>
              <OrderStatusBadge status={order.status} />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
