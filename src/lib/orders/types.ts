import type { Decimal } from "@/lib/api";
import type { BackendOrderStatus } from "@/lib/order-status-map";

export type OrderSide = "CLIENT_BUYS_ASSET" | "CLIENT_SELLS_ASSET";
export type BackendCancelParty = "CLIENT" | "CASHIER";

/**
 * Corpo de `POST /orders` — campos confirmados direto no Swagger do
 * ambiente de teste (`/docs-json`) e, na sequência, contra uma resposta
 * 201 real em 2026-08-14: `asset` é sempre `"USDT"` (único ativo
 * negociado nesta troca) e `assetAmount` é a quantidade de USDT (mesmo
 * valor que o front chama de `netAmount` no quote local). Confirmado:
 * o backend calcula `fiatAmount = assetAmount * rate` — front nunca
 * manda o valor em BRL diretamente.
 */
export interface CreateOrderPayload {
  side: OrderSide;
  asset: "USDT";
  assetAmount: Decimal;
  rate: Decimal;
  /** Obrigatório quando `side === "CLIENT_BUYS_ASSET"` — endereço que
   * recebe o USDT, fixado no contrato de custódia no momento do aceite.
   * Backend valida checksum base58check de verdade (422 específico se
   * o endereço não bater, testado contra a API real). */
  clientTronAddress?: string;
  /** `true` publica a ordem na mesma chamada; não existe endpoint
   * `/orders/:id/publish` separado (correção da auditoria anterior). */
  publish?: boolean;
}

/**
 * Corpo de `POST /orders/:id/pix` — quem RECEBE em BRL nesta ordem
 * registra a própria chave; o documento é conferido contra o KYC de
 * quem registra (trava anti-triangulação). Ver `orders.service.ts`
 * (`registerPix`) no `marinsprosper-api`.
 */
export interface RegisterPixPayload {
  pixKey: string;
  /** CPF/CNPJ sem formatação (só dígitos), do dono da chave. */
  pixDocument: string;
}

export interface CancelResponsePayload {
  /** `true` aceita o cancelamento; `false` recusa (abre disputa). */
  accept: boolean;
}

/** Espelha `Order` do Prisma real (`present(order)` em
 * `orders.service.ts`) — mesmos 11 estados de `BackendOrderStatus`
 * (`order-status-map.ts`), sem nome de contraparte (o backend não expõe
 * nenhum endpoint público de perfil de usuário ainda — ver
 * [[14 - Ofertas e Ordens]]) e sem comprovante/TXID informado pelo
 * usuário (os endpoints de transição não recebem corpo; evidência vive
 * no chat/disputa, buckets ainda não integrados).
 */
export interface BackendOrder {
  id: string;
  side: OrderSide;
  status: BackendOrderStatus;
  clientId: string;
  cashierId: string | null;
  asset: "USDT";
  assetAmount: Decimal;
  fiatAmount: Decimal;
  rate: Decimal;
  feeAmount: Decimal;
  pixKey: string | null;
  pixDocument: string | null;
  clientTronAddress: string | null;
  escrowId: string | null;
  lockTxHash: string | null;
  settleTxHash: string | null;
  /** Status de origem, guardado só enquanto `status === "CANCEL_REQUESTED"`
   * — é pra onde a ordem volta se a contraparte recusar. */
  cancelRequestedFrom: BackendOrderStatus | null;
  cancelRequestedBy: BackendCancelParty | null;
  cancelledBy: BackendCancelParty | null;
  expiresAt: string | null;
  acceptedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
