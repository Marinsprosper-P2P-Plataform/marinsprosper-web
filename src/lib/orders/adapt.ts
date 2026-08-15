import { mapBackendOrderStatus, type OrderViewerRole } from "@/lib/order-status-map";
import type { CancelRequester, Order } from "@/types/order";
import type { BackendOrder } from "./types";

/** Primeiros 8 caracteres do UUID, maiúsculos — só pra ter um
 * identificador curto de exibir, já que a API real não tem `publicId`
 * sequencial como o protótipo mock tinha. */
function shortId(id: string) {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

/** `caller` só vê a ordem se for parte, mediador, ou (livro `OPEN`)
 * caixeiro — nunca outro cliente. Then, o papel de quem olha (`cliente`
 * só se for `clientId`; caso contrário `caixeiro`, cobrindo tanto o
 * caixeiro já aceito quanto qualquer caixeiro olhando o livro `OPEN`). */
function viewerRoleOf(order: BackendOrder, viewerId: string): OrderViewerRole {
  return order.clientId === viewerId ? "cliente" : "caixeiro";
}

/**
 * Converte a ordem real do backend (`BackendOrder`, `src/lib/orders/types.ts`)
 * pro formato rico do protótipo (`Order`, `src/types/order.ts`) — assim
 * `OrderTimeline`/`OrderStatusBadge`/as listagens continuam funcionando
 * sem reescrever tudo de novo. Campos que a API real não expõe ainda
 * (nome de contraparte, comprovante, TXID informado por usuário, motivo
 * de cancelamento/disputa, snapshot de chave PIX) saem com um valor
 * honesto — nome vira um identificador curto derivado do id, o resto
 * fica `undefined` e os componentes já toleram isso.
 */
export function presentOrderForFrontend(order: BackendOrder, viewerId: string): Order {
  const viewerRole = viewerRoleOf(order, viewerId);
  const status = mapBackendOrderStatus(order.status, viewerRole);

  const grossAmount = Number(order.fiatAmount);
  const feeAmount = Number(order.feeAmount);

  return {
    id: order.id,
    publicId: `#${shortId(order.id)}`,
    type: order.side === "CLIENT_BUYS_ASSET" ? "compra" : "venda",
    asset: "USDT",
    network: "TRC20",
    fiatCurrency: "BRL",
    paymentMethod: "PIX",
    grossAmount,
    quote: Number(order.rate),
    feePercent: grossAmount > 0 ? Math.round((feeAmount / grossAmount) * 10000) / 100 : 0,
    feeAmount,
    netAmount: Number(order.assetAmount),
    status,
    clientId: order.clientId,
    clientName: `Cliente ${shortId(order.clientId)}`,
    cashierId: order.cashierId ?? undefined,
    cashierName: order.cashierId ? `Caixeiro ${shortId(order.cashierId)}` : undefined,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    txid: order.settleTxHash ?? undefined,
    cancelRequestedBy: cancelRequesterOf(order.cancelRequestedBy),
    previousMainlineStatus:
      status === "CANCEL_REQUESTED" && order.cancelRequestedFrom
        ? mapBackendOrderStatus(order.cancelRequestedFrom, viewerRole)
        : undefined,
    paymentDeadline: order.expiresAt ?? undefined,
  };
}

function cancelRequesterOf(party: BackendOrder["cancelRequestedBy"]): CancelRequester | undefined {
  if (party === "CLIENT") return "cliente";
  if (party === "CASHIER") return "caixeiro";
  return undefined;
}
