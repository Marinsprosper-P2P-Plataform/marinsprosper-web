"use client";

import { OfferList } from "@/components/shared/offer-list";
import { useMockOrders } from "@/lib/mock/orders";
import { useMockSession } from "@/lib/mock/session";
import { formatBRL } from "@/lib/mock/format";

/** GET /orders (status=OPEN) — corresponde ao card "Listagem de
 * ofertas/ordens disponíveis". No protótipo, qualquer conta pode
 * aceitar (ver src/lib/mock/session.tsx) — só não pode aceitar a
 * própria ordem (sem autonegociação). Compra e venda ficam juntas numa
 * lista só, sem abas — `OrderTypeBadge` (ver `offer-list.tsx`) indica o
 * tipo em cada linha. */
export default function OffersPage() {
  const { orders } = useMockOrders();
  const { user } = useMockSession();

  const openOrders = orders.filter((order) => order.status === "OPEN");

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h1 className="text-xl font-semibold">Ofertas</h1>
        <p className="text-muted-foreground text-sm">
          Ordens abertas aguardando um caixeiro
        </p>
      </div>

      <p className="text-muted-foreground text-sm">
        Limite disponível: <span className="text-foreground font-medium">{formatBRL(user.cashierAvailableLimit)}</span>
      </p>

      <OfferList orders={openOrders} />
    </div>
  );
}
