"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReputationStars } from "@/components/shared/reputation-stars";
import { useMockOrders } from "@/lib/mock/orders";
import { useMockSession } from "@/lib/mock/session";
import { formatBRL } from "@/lib/mock/format";
import { getUserReputation } from "@/lib/mock/reputation";
import type { OrderType } from "@/types/order";

/** GET /orders (status=OPEN) — corresponde ao card "Listagem de
 * ofertas/ordens disponíveis". No protótipo, qualquer conta pode
 * aceitar (ver src/lib/mock/session.tsx) — só não pode aceitar a
 * própria ordem (sem autonegociação). Abas Comprar/Vender filtram por
 * `order.type` — sem aba "todas" de propósito, igual ao pedido original. */
export default function OffersPage() {
  const { orders, acceptOrder } = useMockOrders();
  const { user } = useMockSession();
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [tab, setTab] = useState<OrderType>("compra");

  const openOrders = orders.filter((order) => order.status === "OPEN" && order.type === tab);
  const availableLimit = user.cashierAvailableLimit;

  async function handleAccept(orderId: string, grossAmount: number) {
    if (acceptingId) return; // trava por clique duplo — idempotência na UI
    if (grossAmount > availableLimit) {
      toast.error("Esse valor excede seu limite disponível");
      return;
    }

    setAcceptingId(orderId);
    await new Promise((resolve) => setTimeout(resolve, 400));
    acceptOrder(orderId, user.id, user.name);
    toast.success("Ordem aceita — caução reservada no contrato");
    setAcceptingId(null);
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h1 className="text-xl font-semibold">Ofertas</h1>
        <p className="text-muted-foreground text-sm">
          Ordens abertas aguardando um caixeiro
        </p>
      </div>

      <p className="text-muted-foreground text-sm">
        Limite disponível: <span className="text-foreground font-medium">{formatBRL(availableLimit)}</span>
      </p>

      <Tabs value={tab} onValueChange={(value) => setTab(value as OrderType)}>
        <TabsList>
          <TabsTrigger value="compra">Comprar</TabsTrigger>
          <TabsTrigger value="venda">Vender</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="flex flex-col gap-3 pt-3">
          {openOrders.length === 0 && (
            <p className="text-muted-foreground text-sm">Nenhuma oferta aberta no momento.</p>
          )}

          <ul className="flex flex-col gap-3">
            {openOrders.map((order) => {
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
                      <Badge variant={order.type === "compra" ? "default" : "secondary"}>
                        {order.type === "compra" ? "Compra" : "Venda"}
                      </Badge>
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
                      <span className="text-muted-foreground text-xs">{order.clientName}</span>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
