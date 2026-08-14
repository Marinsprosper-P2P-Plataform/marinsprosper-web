"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { OrderTypeBadge } from "@/components/shared/order-status-badge";
import { ReputationStars } from "@/components/shared/reputation-stars";
import { useMockOrders } from "@/lib/mock/orders";
import { useMockPixKeys } from "@/lib/mock/pix-keys";
import { useMockSession } from "@/lib/mock/session";
import { formatBRL } from "@/lib/mock/format";
import { getUserReputation } from "@/lib/mock/reputation";
import type { Order } from "@/types/order";
import { acceptOrderRequest } from "@/lib/orders/api";
import { generateIdempotencyKey, ApiError, ApiNetworkError } from "@/lib/api";

/**
 * Listagem de ordens `OPEN` com aceite — reaproveitada em `/offers` e na
 * sub-aba "Disponível" de `/orders`, já que as duas mostram exatamente a
 * mesma coisa (ver `[[Kanban]]`, bucket Ofertas & Ordens: a aba
 * Disponível deixou de navegar pra `/offers` e passou a renderizar a
 * lista inline). Sem separação por Comprar/Vender — `OrderTypeBadge`
 * indica o tipo em cada linha.
 */
export function OfferList({ orders }: { orders: Order[] }) {
  const { acceptOrder } = useMockOrders();
  const { pixKeys } = useMockPixKeys();
  const { user } = useMockSession();
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const availableLimit = user.cashierAvailableLimit;

  async function handleAccept(orderId: string, grossAmount: number) {
    if (acceptingId) return; // trava por clique duplo — idempotência na UI
    if (grossAmount > availableLimit) {
      toast.error("Esse valor excede seu limite disponível");
      return;
    }

    setAcceptingId(orderId);

    // Chamada real ao backend (POST /orders/:id/accept) — testada e
    // confirmada contra o ambiente de teste (2026-08-14), incluindo o
    // próprio 422 de espelho de colateral desatualizado que este catch
    // trata. `GET /orders` ainda não está ligado, então os ids de
    // `orders` aqui continuam sendo do "backend fake" em memória e vão
    // bater 404 contra a API real até a listagem também ser real — 422
    // (caução insuficiente/limite excedido/espelho vencido) é o único
    // caso que já vale mostrar pro usuário como está, é exatamente o
    // erro específico que o card pede pra não tratar como genérico.
    try {
      await acceptOrderRequest(orderId, generateIdempotencyKey());
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) {
        toast.error(error.message || "Caução insuficiente ou limite excedido");
      } else if (error instanceof ApiNetworkError) {
        console.warn("[offer-list] POST /orders/:id/accept (real) falhou por rede:", error);
      } else if (error instanceof ApiError) {
        console.warn("[offer-list] POST /orders/:id/accept (real) falhou:", error);
      }
      // Não interrompe o fluxo do protótipo — segue aceitando localmente
      // mesmo se a chamada real falhar (ver comentário acima).
    }

    await new Promise((resolve) => setTimeout(resolve, 400));
    // Snapshot da primeira chave PIX do caixeiro no momento do aceite —
    // sem isso o cliente não saberia pra qual conta transferir numa
    // ordem de compra (ver comentário em `Order.cashierPixKeySnapshot`).
    const cashierPixKey = pixKeys.find((key) => key.userId === user.id);
    acceptOrder(
      orderId,
      user.id,
      user.name,
      cashierPixKey && { type: cashierPixKey.type, key: cashierPixKey.key, bank: cashierPixKey.bank },
    );
    toast.success("Ordem aceita — caução reservada no contrato");
    setAcceptingId(null);
  }

  if (orders.length === 0) {
    return <p className="text-muted-foreground text-sm">Nenhuma oferta aberta no momento.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {orders.map((order) => {
        const isOwnOrder = order.clientId === user.id;
        const exceedsLimit = order.grossAmount > availableLimit;
        const clientReputation = getUserReputation(orders, order.clientId);

        return (
          <li
            key={order.id}
            className="border-border flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <OrderTypeBadge type={order.type} />
                <span className="text-muted-foreground text-xs">{order.publicId}</span>
                {isOwnOrder && (
                  <span className="text-muted-foreground text-xs">Sua ordem</span>
                )}
              </div>
              <p className="font-medium">
                {formatBRL(order.grossAmount)}{" "}
                <span className="text-muted-foreground font-normal">via {order.paymentMethod}</span>
              </p>
              <p className="text-muted-foreground text-xs">
                Cotação estimada {formatBRL(order.quote)}/USDT
              </p>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs">Reputação do cliente</span>
                <ReputationStars reputation={clientReputation} emptyLabel="Sem avaliações" className="text-xs" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`/orders/${order.id}`}>Detalhes</Link>
              </Button>
              {!isOwnOrder && (
                <Button
                  size="sm"
                  disabled={acceptingId === order.id || exceedsLimit}
                  onClick={() => handleAccept(order.id, order.grossAmount)}
                >
                  {exceedsLimit ? "Excede limite" : "Aceitar"}
                </Button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
