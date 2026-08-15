"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { OrderStatusBadge } from "@/components/shared/order-status-badge";
import { OrderTimeline } from "@/components/shared/order-timeline";
import { OrderActions } from "@/components/shared/order-actions";
import { OrderResolutionPanel } from "@/components/shared/order-resolution-panel";
import { OrderChat } from "@/components/shared/order-chat";
import { useMockSession } from "@/lib/mock/session";
import { formatBRL, formatUSDT } from "@/lib/mock/format";
import { presentOrderForFrontend } from "@/lib/orders/adapt";
import { getOrderRequest } from "@/lib/orders/api";
import type { BackendOrder } from "@/lib/orders/types";
import { ApiError, ApiNetworkError } from "@/lib/api";

/**
 * `GET /orders/:id` real — a checagem de participante (IDOR) é do
 * backend (`assertCanRead`: parte, mediador, ou qualquer caixeiro pra
 * ordem `OPEN`); um 404 aqui cobre tanto "não existe" quanto "não é
 * sua", de propósito (o mesmo endpoint não pode virar um oráculo de
 * quais ordens existem). Nome de contraparte, comprovante e snapshot de
 * chave PIX ainda não têm de onde vir na API real — ver
 * `presentOrderForFrontend` (`src/lib/orders/adapt.ts`) e
 * [[14 - Ofertas e Ordens]].
 */
export function OrderDetail({ orderId }: { orderId: string }) {
  const { user } = useMockSession();
  const [order, setOrder] = useState<BackendOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // Incrementado pra forçar um refetch (ex. depois de abrir uma disputa,
  // cuja resposta é a disputa criada, não a ordem) sem duplicar a lógica
  // de busca fora do efeito.
  const [refetchToken, setRefetchToken] = useState(0);
  const refetch = () => setRefetchToken((token) => token + 1);

  // `loading` só cobre a primeira carga (inicia `true`) — um refetch
  // atualiza a ordem sem esconder o que já estava na tela.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data } = await getOrderRequest(orderId);
        if (cancelled) return;
        setOrder(data);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setError("Ordem não encontrada.");
        } else if (err instanceof ApiNetworkError) {
          setError(err.message);
        } else {
          setError("Não foi possível carregar a ordem.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orderId, refetchToken]);

  if (loading) {
    return <p className="text-muted-foreground p-4 text-sm">Carregando...</p>;
  }

  if (error || !order) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <p className="text-muted-foreground text-sm">{error ?? "Ordem não encontrada."}</p>
        <Link href="/orders" className="text-foreground text-sm underline">
          Voltar para minhas ordens
        </Link>
      </div>
    );
  }

  const frontendOrder = presentOrderForFrontend(order, user.id);
  const isParticipant = order.clientId === user.id || order.cashierId === user.id;

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
          <span className="text-muted-foreground text-xs">{frontendOrder.publicId}</span>
          <OrderStatusBadge status={frontendOrder.status} />
        </div>
        <h1 className="text-xl font-semibold">
          {frontendOrder.type === "compra" ? "Compra" : "Venda"} de USDT —{" "}
          {formatBRL(frontendOrder.grossAmount)}
        </h1>
        <p className="text-muted-foreground text-sm">
          Taxa {formatBRL(frontendOrder.feeAmount)} ({frontendOrder.feePercent}%) ·{" "}
          {formatUSDT(frontendOrder.netAmount)} · {frontendOrder.paymentMethod}
        </p>
        {frontendOrder.cashierName && (
          <p className="text-muted-foreground text-sm">{frontendOrder.cashierName}</p>
        )}
      </div>

      <OrderTimeline status={frontendOrder.status} lastMainlineStatus={frontendOrder.previousMainlineStatus} />

      <OrderActions order={order} viewerId={user.id} onUpdated={setOrder} />
      <OrderResolutionPanel order={order} viewerId={user.id} onUpdated={setOrder} onDisputeOpened={refetch} />

      {/* Chat só faz sentido entre as duas partes já ligadas à ordem —
       * um caixeiro só olhando uma oferta OPEN pra decidir se aceita
       * ainda não tem com quem conversar. Continua mock (bucket "Chat &
       * Comprovantes", ainda não integrado à API real). */}
      {isParticipant && <OrderChat order={frontendOrder} />}
    </div>
  );
}
