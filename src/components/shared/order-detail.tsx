"use client";

import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { OrderStatusBadge } from "@/components/shared/order-status-badge";
import { OrderTimeline } from "@/components/shared/order-timeline";
import { OrderActions } from "@/components/shared/order-actions";
import { OrderResolutionPanel } from "@/components/shared/order-resolution-panel";
import { OrderChat } from "@/components/shared/order-chat";
import { ProofLink } from "@/components/shared/proof-link";
import { ReputationStars } from "@/components/shared/reputation-stars";
import { useMockOrders } from "@/lib/mock/orders";
import { useMockSession } from "@/lib/mock/session";
import { formatBRL, formatUSDT } from "@/lib/mock/format";
import { getUserReputation } from "@/lib/mock/reputation";

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
  // ID na URL (ver Documentação de Segurança, ameaça de IDOR). Uma
  // conta pode ser cliente numa ordem e caixeiro em outra ao mesmo
  // tempo, então as duas checagens não são mais exclusivas entre si.
  // Qualquer conta pode ver ordens ainda OPEN (de qualquer cliente)
  // pra decidir se aceita.
  const isParticipant =
    order.clientId === user.id || order.cashierId === user.id || order.status === "OPEN";

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

  // Reputação de quem está do outro lado desta ordem — cliente vê a do
  // caixeiro (se já aceitou), caixeiro vê a do cliente (sempre definido).
  const isClient = order.clientId === user.id;
  const counterpartyId = isClient ? order.cashierId : order.clientId;
  const counterpartyName = isClient ? order.cashierName : order.clientName;
  const counterpartyReputation = counterpartyId ? getUserReputation(orders, counterpartyId) : null;

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
        {counterpartyName && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">{counterpartyName}</span>
            <ReputationStars reputation={counterpartyReputation} emptyLabel="Sem avaliações" />
          </div>
        )}
      </div>

      <OrderTimeline
        status={order.status}
        lastMainlineStatus={order.previousMainlineStatus}
      />

      {/* Registro persistente do comprovante — continua acessível depois
       * que a ordem sai do passo "Confirmação do caixeiro" em
       * `OrderActions` (útil pra conferir depois, inclusive em disputa). */}
      {order.clientProofUrl && (
        <div className="flex flex-col gap-1.5">
          <h2 className="text-sm font-medium">Comprovante do cliente</h2>
          <ProofLink url={order.clientProofUrl} name={order.clientProofName} />
        </div>
      )}

      <OrderActions order={order} />
      <OrderResolutionPanel order={order} />

      {/* Chat só faz sentido entre as duas partes já ligadas à ordem —
       * um caixeiro só olhando uma oferta OPEN pra decidir se aceita
       * ainda não tem com quem conversar. */}
      {(order.clientId === user.id || order.cashierId === user.id) && (
        <OrderChat order={order} />
      )}
    </div>
  );
}
