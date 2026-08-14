import { api } from "@/lib/api";
import type { BackendOrder, CreateOrderPayload } from "./types";

export function createOrderRequest(payload: CreateOrderPayload, idempotencyKey: string) {
  return api.post<BackendOrder>("/orders", payload, { idempotencyKey });
}

/** Sem corpo — `POST /orders/:id/accept` confirmado no Swagger como só
 * path param + `Idempotency-Key`. */
export function acceptOrderRequest(orderId: string, idempotencyKey: string) {
  return api.post<BackendOrder>(`/orders/${orderId}/accept`, undefined, { idempotencyKey });
}
