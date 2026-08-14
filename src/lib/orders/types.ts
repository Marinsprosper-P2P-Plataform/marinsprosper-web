import type { Decimal } from "@/lib/api";

export type OrderSide = "CLIENT_BUYS_ASSET" | "CLIENT_SELLS_ASSET";

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
 * Resposta real de `POST /orders` contra o ambiente de teste
 * (2026-08-14, ver commit) — não documentada no Swagger, capturada por
 * inspeção direta de uma resposta 201. `GET /orders/:id` ainda não
 * testado; assume-se o mesmo formato até confirmar.
 */
export interface BackendOrder {
  id: string;
  side: OrderSide;
  status: string;
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
  cancelRequestedFrom: string | null;
  cancelRequestedBy: string | null;
  expiresAt: string | null;
  acceptedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
