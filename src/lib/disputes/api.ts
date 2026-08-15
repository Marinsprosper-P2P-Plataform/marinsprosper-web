import { api } from "@/lib/api";
import type { OpenDisputePayload } from "./types";

/**
 * `POST /orders/:id/dispute` — abre a mediação. Só as partes abrem, só a
 * partir do momento em que alguém declarou pagamento (a máquina de
 * estados do backend recusa fora disso, 409). A resposta é a disputa
 * criada, não a ordem — quem chama precisa buscar a ordem de novo
 * separadamente (`getOrderRequest`) pra refletir `status: DISPUTED`.
 */
export function openDisputeRequest(orderId: string, payload: OpenDisputePayload, idempotencyKey: string) {
  return api.post<{ id: string }>(`/orders/${orderId}/dispute`, payload, { idempotencyKey });
}
