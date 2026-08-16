"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { OrderStatusBadge } from "@/components/shared/order-status-badge";
import { OrderTimeline } from "@/components/shared/order-timeline";
import { OrderActions } from "@/components/shared/order-actions";
import { OrderResolutionPanel } from "@/components/shared/order-resolution-panel";
import { OrderChat } from "@/components/shared/order-chat";
import { ReputationStars } from "@/components/shared/reputation-stars";
import { useAuth } from "@/lib/auth";
import { formatBRL, formatUSDT } from "@/lib/mock/format";
import type { Reputation } from "@/lib/mock/reputation";
import { presentOrderForFrontend } from "@/lib/orders/adapt";
import { getOrderRequest } from "@/lib/orders/api";
import type { BackendOrder } from "@/lib/orders/types";
import { getUserReputationRequest } from "@/lib/ratings/api";
import { ApiError, ApiNetworkError } from "@/lib/api";

/**
 * `GET /orders/:id` real — a checagem de participante (IDOR) é do
 * backend (`assertCanRead`: parte, mediador, ou qualquer caixeiro pra
 * ordem `OPEN`); um 404 aqui cobre tanto "não existe" quanto "não é
 * sua", de propósito (o mesmo endpoint não pode virar um oráculo de
 * quais ordens existem). Nome de contraparte, comprovante e snapshot de
 * chave PIX ainda não têm de onde vir na API real — ver
 * `presentOrderForFrontend` (`src/lib/orders/adapt.ts`). Reputação da
 * contraparte já vem real (`GET /users/:id/ratings`), mesmo sem nome
 * pra acompanhar. Ver
 * [[14 - Ofertas e Ordens]]. `viewerId` vem do JWT real (`useAuth`), não
 * de `useMockSession` — comparar `order.clientId`/`cashierId` contra a
 * identidade "vista como" do `AccountSwitcher` fazia toda ordem real
 * mostrar os controles do papel errado (achado registrado no
 * [[Kanban]], corrigido aqui).
 */
export function OrderDetail({ orderId }: { orderId: string }) {
  const { user } = useAuth();
  const viewerId = user?.id ?? "";
  const [order, setOrder] = useState<BackendOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // Incrementado pra forçar um refetch (ex. depois de abrir uma disputa,
  // cuja resposta é a disputa criada, não a ordem) sem duplicar a lógica
  // de busca fora do efeito.
  const [refetchToken, setRefetchToken] = useState(0);
  const refetch = () => setRefetchToken((token) => token + 1);
  const [counterpartyReputation, setCounterpartyReputation] = useState<Reputation | null>(null);

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

  // Reputação da contraparte — `GET /users/:id/ratings` real, só quando
  // já existe alguém do outro lado (`cashierId` preenchido, ordem já
  // aceita) e a conta não é a própria.
  useEffect(() => {
    const counterpartyId = order?.clientId === viewerId ? order?.cashierId : order?.clientId;
    // Sem contraparte ainda (ordem `OPEN`, sem caixeiro): estado inicial
    // já é `null`, nada a fazer — `cashierId` nunca "desaparece" depois
    // de setado, então não há caso real de precisar limpar de novo aqui.
    if (!counterpartyId) return;

    let cancelled = false;
    getUserReputationRequest(counterpartyId)
      .then(({ data }) => {
        if (cancelled) return;
        setCounterpartyReputation(data.count > 0 ? { average: data.average ?? 0, count: data.count } : null);
      })
      .catch(() => {
        if (!cancelled) setCounterpartyReputation(null);
      });

    return () => {
      cancelled = true;
    };
  }, [order?.clientId, order?.cashierId, viewerId]);

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

  const frontendOrder = presentOrderForFrontend(order, viewerId);
  const isParticipant = order.clientId === viewerId || order.cashierId === viewerId;

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
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">{frontendOrder.cashierName}</span>
            <ReputationStars reputation={counterpartyReputation} emptyLabel="Sem avaliações" className="text-xs" />
          </div>
        )}
      </div>

      <OrderTimeline status={frontendOrder.status} lastMainlineStatus={frontendOrder.previousMainlineStatus} />

      <OrderActions order={order} viewerId={viewerId} onUpdated={setOrder} />
      <OrderResolutionPanel order={order} viewerId={viewerId} onUpdated={setOrder} onDisputeOpened={refetch} />

      {/* Chat só faz sentido entre as duas partes já ligadas à ordem —
       * um caixeiro só olhando uma oferta OPEN pra decidir se aceita
       * ainda não tem com quem conversar. Real agora — ver
       * [[15 - Chat e Comprovantes]]. */}
      {isParticipant && (
        <OrderChat orderId={order.id} clientId={order.clientId} cashierId={order.cashierId} viewerId={viewerId} />
      )}
    </div>
  );
}
