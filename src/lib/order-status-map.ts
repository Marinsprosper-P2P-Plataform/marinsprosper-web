import type { OrderStatus } from "@/types/order";

/**
 * Máquina de estados real do backend (`OrderStatus` do `marinsprosper-api`)
 * — bem mais enxuta que a do front. Ver [[21 - Integração com API Real]]
 * §2 pra tabela completa e o raciocínio por trás de cada mapeamento
 * abaixo. `SUSPENDED`/`CLOSED`/`FROZEN_FOR_AUDIT` do front não têm
 * equivalente aqui de propósito — não existem no backend.
 */
export type BackendOrderStatus =
  | "DRAFT"
  | "OPEN"
  | "ACCEPTED"
  | "CLIENT_TRANSFERRED"
  | "RECEIPT_CONFIRMED"
  | "CASHIER_TRANSFERRED"
  | "COMPLETED"
  | "CANCEL_REQUESTED"
  | "CANCELLED"
  | "DISPUTED"
  | "EXPIRED";

export type OrderViewerRole = "cliente" | "caixeiro";

/**
 * Traduz o status real do backend pro `OrderStatus` do front, na
 * perspectiva de quem está olhando. Os 4 pares `AWAITING_*` não são
 * estados próprios no backend — são a mesma etapa (`ACCEPTED`,
 * `CLIENT_TRANSFERRED`, `RECEIPT_CONFIRMED`, `CASHIER_TRANSFERRED`)
 * interpretada de um jeito diferente por cada papel: quem acabou de agir
 * vê o rótulo "neutro" (`ACCEPTED`, `CLIENT_MARKED_TRANSFERRED`...); quem
 * ainda precisa agir (ou só está esperando) vê o `AWAITING_*`
 * correspondente.
 *
 * `CANCEL_REJECTED` também não existe no backend — recusar um
 * cancelamento simplesmente devolve o status pro que era antes
 * (`cancelRequestedFrom`), então nunca chega aqui como valor de entrada;
 * é responsabilidade de quem consome as atualizações (fora desta função,
 * ver bucket "Ordens & Ofertas") detectar essa transição comparando o
 * status novo com o anterior.
 *
 * `DISPUTED`: o backend tem um único estado pras 3 fases que o front
 * modela (`DISPUTE_OPEN`/`DISPUTE_UNDER_REVIEW`/`DISPUTE_RESOLVED`, que
 * não existem no schema real ainda) — mapeado pra `DISPUTE_OPEN` por
 * padrão; diferenciar as fases exige o card de Disputas (bucket "Ordens
 * & Ofertas"), que também vai trazer os dados que faltam pra isso.
 */
export function mapBackendOrderStatus(
  status: BackendOrderStatus,
  viewerRole: OrderViewerRole,
): OrderStatus {
  switch (status) {
    case "DRAFT":
      return "DRAFT";
    case "OPEN":
      return "OPEN";
    case "ACCEPTED":
      return viewerRole === "cliente" ? "AWAITING_CLIENT_TRANSFER" : "ACCEPTED";
    case "CLIENT_TRANSFERRED":
      return viewerRole === "caixeiro"
        ? "AWAITING_CASHIER_CONFIRMATION"
        : "CLIENT_MARKED_TRANSFERRED";
    case "RECEIPT_CONFIRMED":
      return viewerRole === "cliente"
        ? "AWAITING_CASHIER_TRANSFER"
        : "CASHIER_CONFIRMED_RECEIPT";
    case "CASHIER_TRANSFERRED":
      return viewerRole === "cliente"
        ? "AWAITING_CLIENT_CONFIRMATION"
        : "CASHIER_MARKED_TRANSFERRED";
    case "COMPLETED":
      return "COMPLETED";
    case "CANCEL_REQUESTED":
      return "CANCEL_REQUESTED";
    case "CANCELLED":
      return "CANCEL_ACCEPTED";
    case "DISPUTED":
      return "DISPUTE_OPEN";
    case "EXPIRED":
      return "EXPIRED";
  }
}
