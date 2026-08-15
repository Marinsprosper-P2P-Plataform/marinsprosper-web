import { api } from "@/lib/api";
import type {
  BackendOrder,
  CancelResponsePayload,
  CreateOrderPayload,
  RegisterPixPayload,
} from "./types";

export function createOrderRequest(payload: CreateOrderPayload, idempotencyKey: string) {
  return api.post<BackendOrder>("/orders", payload, { idempotencyKey });
}

/** Sem corpo — `POST /orders/:id/accept` confirmado no Swagger como só
 * path param + `Idempotency-Key`. */
export function acceptOrderRequest(orderId: string, idempotencyKey: string) {
  return api.post<BackendOrder>(`/orders/${orderId}/accept`, undefined, { idempotencyKey });
}

/** `status` opcional filtra no backend; sem ele, `list()` já devolve só
 * o que a conta pode ver (próprias ordens + livro `OPEN` pra caixeiro). */
export function listOrdersRequest(status?: string) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return api.get<BackendOrder[]>(`/orders${query}`);
}

export function getOrderRequest(orderId: string) {
  return api.get<BackendOrder>(`/orders/${orderId}`);
}

/** Registrada por quem RECEBE em BRL nesta ordem — nunca por quem paga. */
export function registerPixRequest(
  orderId: string,
  payload: RegisterPixPayload,
  idempotencyKey: string,
) {
  return api.post<BackendOrder>(`/orders/${orderId}/pix`, payload, { idempotencyKey });
}

export function clientTransferRequest(orderId: string, idempotencyKey: string) {
  return api.post<BackendOrder>(`/orders/${orderId}/client-transfer`, undefined, {
    idempotencyKey,
  });
}

export function cashierConfirmReceiptRequest(orderId: string, idempotencyKey: string) {
  return api.post<BackendOrder>(`/orders/${orderId}/cashier-confirm-receipt`, undefined, {
    idempotencyKey,
  });
}

export function cashierTransferRequest(orderId: string, idempotencyKey: string) {
  return api.post<BackendOrder>(`/orders/${orderId}/cashier-transfer`, undefined, {
    idempotencyKey,
  });
}

export function clientConfirmRequest(orderId: string, idempotencyKey: string) {
  return api.post<BackendOrder>(`/orders/${orderId}/client-confirm`, undefined, {
    idempotencyKey,
  });
}

/** Pede cancelamento à contraparte — sem corpo; a contraparte responde
 * via `cancelResponseRequest`. Só um dos dois lados por vez pode estar
 * com um pedido em aberto (a máquina de estados trava isso). */
export function cancelRequestRequest(orderId: string, idempotencyKey: string) {
  return api.post<BackendOrder>(`/orders/${orderId}/cancel-request`, undefined, {
    idempotencyKey,
  });
}

export function cancelResponseRequest(
  orderId: string,
  payload: CancelResponsePayload,
  idempotencyKey: string,
) {
  return api.post<BackendOrder>(`/orders/${orderId}/cancel-response`, payload, {
    idempotencyKey,
  });
}

/** Cancelamento direto — só em `DRAFT`/`OPEN`, antes de qualquer aceite
 * (sem colateral travado ainda, então não precisa de acordo da
 * contraparte). */
export function cancelOrderRequest(orderId: string, idempotencyKey: string) {
  return api.post<BackendOrder>(`/orders/${orderId}/cancel`, undefined, { idempotencyKey });
}
