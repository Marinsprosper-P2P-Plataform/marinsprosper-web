"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { OrderTypeBadge } from "@/components/shared/order-status-badge";
import { ReputationStars } from "@/components/shared/reputation-stars";
import { useMockSession } from "@/lib/mock/session";
import { formatBRL } from "@/lib/mock/format";
import { getUserReputation } from "@/lib/mock/reputation";
import type { Order } from "@/types/order";
import { acceptOrderRequest } from "@/lib/orders/api";
import { generateIdempotencyKey, ApiError, ApiNetworkError } from "@/lib/api";

/**
 * Listagem de ordens `OPEN` com aceite — usada na sub-aba "Disponível"
 * de `/orders`. `/offers` deixou de mostrar ordens avulsas e agora lista
 * `Listing` (anúncios persistentes negociáveis — ver `ListingWizard`);
 * esta lista continua existindo aqui pra quem cria ordem direto, sem
 * passar por uma oferta. Sem separação por Comprar/Vender —
 * `OrderTypeBadge` indica o tipo em cada linha.
 */
export function OfferList({ orders, onAccepted }: { orders: Order[]; onAccepted?: () => void }) {
  const { user } = useMockSession();
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  // Feedback visual imediato do botão, antes do pai recarregar a lista
  // via `onAccepted` (`GET /orders` real não empurra atualização —
  // sem isso a ordem continuaria aparecendo como "Aceitar" até o
  // próximo carregamento manual da página).
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());
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
    // próprio 422 de espelho de colateral desatualizado tratado abaixo.
    try {
      await acceptOrderRequest(orderId, generateIdempotencyKey());
      toast.success("Ordem aceita — caução reservada no contrato");
      setAcceptedIds((prev) => new Set(prev).add(orderId));
      onAccepted?.();
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) {
        toast.error(error.message || "Caução insuficiente ou limite excedido");
      } else if (error instanceof ApiError && error.status === 409) {
        toast.error("Outro caixeiro chegou primeiro nesta ordem");
      } else if (error instanceof ApiNetworkError) {
        toast.error(error.message);
      } else if (error instanceof ApiError) {
        toast.error(`Backend recusou o aceite: ${error.message}`);
      } else {
        toast.error("Não foi possível aceitar. Tente novamente.");
      }
    } finally {
      setAcceptingId(null);
    }
  }

  if (orders.length === 0) {
    return <p className="text-muted-foreground text-sm">Nenhuma oferta aberta no momento.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {orders.map((order) => {
        const isOwnOrder = order.clientId === user.id;
        const exceedsLimit = order.grossAmount > availableLimit;
        const accepted = acceptedIds.has(order.id);
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
                  disabled={accepted || acceptingId === order.id || exceedsLimit}
                  onClick={() => handleAccept(order.id, order.grossAmount)}
                >
                  {accepted ? "Aceita" : exceedsLimit ? "Excede limite" : "Aceitar"}
                </Button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
