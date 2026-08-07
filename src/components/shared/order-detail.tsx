"use client";

import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { OrderStatusBadge } from "@/components/shared/order-status-badge";
import { OrderTimeline } from "@/components/shared/order-timeline";
import { OrderActions } from "@/components/shared/order-actions";
import { OrderResolutionPanel } from "@/components/shared/order-resolution-panel";
import { useMockOrders } from "@/lib/mock/orders";
import { useMockSession } from "@/lib/mock/session";
import { formatBRL, formatUSDT } from "@/lib/mock/format";

export function OrderDetail({ orderId }: { orderId: string }) {
  const { orders } = useMockOrders();
  const { user } = useMockSession();
  const order = orders.find((item) => item.id === orderId);

  if (!order) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <p className="text-muted-foreground text-sm">Ordem não encontrada.</p>
        <Link href="/orders" className="text-foreground text-sm underline">
          Voltar para minhas ordens
        </Link>
      </div>
    );
  }

  // Checagem de participante — mesmo em protótipo com dados fake, um
  // cliente não deve ver o detalhe da ordem de outro cliente trocando o
  // ID na URL (ver Documentação de Segurança, ameaça de IDOR). Caixeiro
  // pode ver ordens OPEN pra decidir se aceita, mesmo antes de ser o
  // participante — depois de aceita, só o caixeiro daquela ordem.
  const isParticipant =
    (user.role === "cliente" && order.clientId === user.id) ||
    (user.role === "caixeiro" && (order.cashierId === user.id || order.status === "OPEN"));

  if (!isParticipant) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <p className="text-muted-foreground text-sm">
          Você não tem acesso a esta ordem.
        </p>
        <Link href="/orders" className="text-foreground text-sm underline">
          Voltar para minhas ordens
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      <Link
        href="/orders"
        className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm"
      >
        <ArrowLeftIcon className="size-4" />
        Minhas ordens
      </Link>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">{order.publicId}</span>
          <OrderStatusBadge status={order.status} />
        </div>
        <h1 className="text-xl font-semibold">
          {order.type === "compra" ? "Compra" : "Venda"} de USDT — {formatBRL(order.grossAmount)}
        </h1>
        <p className="text-muted-foreground text-sm">
          Taxa {formatBRL(order.feeAmount)} ({order.feePercent}%) · {formatUSDT(order.netAmount)} ·
          {" "}{order.paymentMethod}
        </p>
      </div>

      <OrderTimeline
        status={order.status}
        lastMainlineStatus={order.previousMainlineStatus}
      />

      <OrderActions order={order} />
      <OrderResolutionPanel order={order} />
    </div>
  );
}
